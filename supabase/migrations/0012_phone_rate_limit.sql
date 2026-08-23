-- Rate limit for the SMS verification endpoint.
--
-- Every send is a real, billed Twilio message, so an unthrottled endpoint
-- is a direct route to someone running up the bill — or to SMS-bombing one
-- person's phone. Counters live in Postgres rather than app memory because
-- serverless invocations don't share state: an in-process Map would reset
-- on every cold start and diverge across concurrent instances.

create table if not exists public.phone_verification_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  phone text not null,
  created_at timestamptz not null default now()
);

create index if not exists phone_verification_attempts_user_idx
  on public.phone_verification_attempts (user_id, created_at desc);
create index if not exists phone_verification_attempts_phone_idx
  on public.phone_verification_attempts (phone, created_at desc);
create index if not exists phone_verification_attempts_created_idx
  on public.phone_verification_attempts (created_at);

-- RLS on with no policies at all: unreachable from the client under any
-- key but the service role. The function below is the only way in, so a
-- user can neither read others' attempts nor delete their own to reset
-- their own limit.
alter table public.phone_verification_attempts enable row level security;

-- Checks the limits and records the attempt in one statement, so two
-- concurrent requests can't both pass a check that only one should.
-- Returns {allowed: bool, reason: text, retry_after_seconds: int}.
create or replace function public.record_phone_verification_attempt(
  target_phone text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  per_user_hour int;
  per_user_day int;
  per_phone_hour int;
  oldest timestamptz;
  wait_seconds int;
begin
  if uid is null then
    return json_build_object('allowed', false, 'reason', 'unauthorized');
  end if;

  select count(*) into per_user_hour
    from public.phone_verification_attempts
    where user_id = uid and created_at > now() - interval '1 hour';

  select count(*) into per_user_day
    from public.phone_verification_attempts
    where user_id = uid and created_at > now() - interval '1 day';

  -- Counted across all users, not just this one: otherwise a handful of
  -- throwaway accounts could still gang up on a single phone number.
  select count(*) into per_phone_hour
    from public.phone_verification_attempts
    where phone = target_phone and created_at > now() - interval '1 hour';

  if per_user_hour >= 5 or per_phone_hour >= 3 then
    select min(created_at) into oldest
      from public.phone_verification_attempts
      where created_at > now() - interval '1 hour'
        and (user_id = uid or phone = target_phone);

    wait_seconds := greatest(
      1,
      ceil(extract(epoch from (oldest + interval '1 hour' - now())))::int
    );

    return json_build_object(
      'allowed', false,
      'reason', 'rate_limited',
      'retry_after_seconds', wait_seconds
    );
  end if;

  if per_user_day >= 15 then
    return json_build_object(
      'allowed', false,
      'reason', 'daily_limit',
      'retry_after_seconds', 3600
    );
  end if;

  insert into public.phone_verification_attempts (user_id, phone)
  values (uid, target_phone);

  -- Opportunistic cleanup: rows older than the widest window are dead
  -- weight. Done on roughly 1% of calls so the table stays bounded
  -- without paying for a delete on every request.
  if random() < 0.01 then
    delete from public.phone_verification_attempts
      where created_at < now() - interval '2 days';
  end if;

  return json_build_object('allowed', true);
end;
$$;

revoke all on function public.record_phone_verification_attempt(text) from public;
grant execute on function public.record_phone_verification_attempt(text) to authenticated;
