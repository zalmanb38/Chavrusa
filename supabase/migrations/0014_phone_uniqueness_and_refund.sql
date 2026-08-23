-- Two changes to phone verification.
--
-- 1. One verified number, one account. Browse is gated on verification so
--    that a suspended or blocked user is costly to replace; without this,
--    the same phone could verify unlimited accounts and that cost is zero.
--    Partial, so unverified and null numbers are unaffected — only a
--    number that actually passed an SMS check claims exclusivity.
--
-- 2. A refund path for the rate limiter. Attempts are recorded before the
--    Twilio call so the limit can't be raced, which means a rejected send
--    still consumes quota even though nothing was billed.

-- Fails if two verified profiles already share a number. To find them:
--   select phone, count(*) from public.profiles
--   where phone_verified and phone is not null
--   group by phone having count(*) > 1;
create unique index if not exists profiles_verified_phone_unique
  on public.profiles (phone)
  where phone_verified and phone is not null;

-- Now returns attempt_id alongside the decision, so a caller that fails
-- downstream can hand back the specific row it consumed.
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
  new_id uuid;
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
  values (uid, target_phone)
  returning id into new_id;

  if random() < 0.01 then
    delete from public.phone_verification_attempts
      where created_at < now() - interval '2 days';
  end if;

  return json_build_object('allowed', true, 'attempt_id', new_id);
end;
$$;

revoke all on function public.record_phone_verification_attempt(text) from public;
grant execute on function public.record_phone_verification_attempt(text) to authenticated;

-- Releases a consumed attempt when the send was rejected outright. Scoped
-- to the caller's own rows and to the last few minutes, so this can only
-- undo an attempt just made — not clear an accumulated history.
create or replace function public.refund_phone_verification_attempt(
  attempt_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  removed int;
begin
  if auth.uid() is null then
    return false;
  end if;

  delete from public.phone_verification_attempts
  where id = attempt_id
    and user_id = auth.uid()
    and created_at > now() - interval '5 minutes';

  get diagnostics removed = row_count;
  return removed > 0;
end;
$$;

revoke all on function public.refund_phone_verification_attempt(uuid) from public;
grant execute on function public.refund_phone_verification_attempt(uuid) to authenticated;
