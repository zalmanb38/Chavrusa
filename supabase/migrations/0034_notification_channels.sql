-- Text notifications alongside email.
--
-- Everything the site tells a member about — a connect request, a reply
-- to one, a time suggested, a session confirmed, a new message — has
-- gone out by email only. Email is also where a notification quietly
-- dies: filed under promotions, or into spam, and never seen. So a
-- member may now choose email, text, or both.
--
-- Two tables. The preference is one row per member; the send log exists
-- only to hold a ceiling on spend, because unlike an email, every text
-- is billed.

-- ─── the preference ─────────────────────────────────────────────────────
-- A table of its own rather than a column on profiles, because profiles
-- is readable by every signed-in member (0001) and how somebody chooses
-- to be contacted is nobody else's business. Same shape as
-- profile_names and profile_contacts: id is the member, and the row is
-- visible to them alone.
--
-- No row is created at signup. A missing row means email, which is
-- exactly what the site did before this migration, so every existing
-- member keeps the behaviour they already have.

create table if not exists public.notification_preferences (
  id uuid primary key references public.profiles(id) on delete cascade,
  channel text not null default 'email'
    check (channel in ('email', 'sms', 'both')),
  -- When they turned texts on. Kept because consent to be texted is
  -- something we may have to show we have, and "the box is ticked now"
  -- is not the same claim as "they ticked it, then".
  sms_consent_at timestamptz,
  -- Set when a STOP reply arrives. Distinct from channel = 'email': one
  -- is a preference, the other is a withdrawal, and only the second one
  -- has to survive the member changing their mind in the UI by accident.
  sms_opted_out_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

-- Own row only, in all three directions. Deliberately no select policy
-- for anybody else: a preference is not profile data.
drop policy if exists "Members read their own notification preferences"
  on public.notification_preferences;
create policy "Members read their own notification preferences"
  on public.notification_preferences for select
  using (auth.uid() = id);

drop policy if exists "Members create their own notification preferences"
  on public.notification_preferences;
create policy "Members create their own notification preferences"
  on public.notification_preferences for insert
  with check (auth.uid() = id);

drop policy if exists "Members update their own notification preferences"
  on public.notification_preferences;
create policy "Members update their own notification preferences"
  on public.notification_preferences for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- updated_at is maintained here rather than trusted from the client, so
-- it cannot be back-dated by whoever is writing the row.
create or replace function public.touch_notification_preferences()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists notification_preferences_touch
  on public.notification_preferences;
create trigger notification_preferences_touch
  before update on public.notification_preferences
  for each row execute function public.touch_notification_preferences();

-- sms_opted_out_at records a carrier-level STOP, which arrives through
-- Twilio's webhook and is written with the service role. A member must
-- not be able to clear it by writing the field directly — but choosing
-- "Text message" again in the interface is a fresh opt-in, and the copy
-- in the settings card promises exactly that, so that transition does
-- lift it. The difference is that the lifting is derived here from the
-- channel they picked, never taken from the request.
--
-- Consent times are stamped here for the same reason: when somebody
-- agreed to be texted is a record about them, not a field they fill in.
create or replace function public.set_notification_consent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  wants_sms boolean := new.channel in ('sms', 'both');
begin
  -- The service role has no auth.uid(), and it is the caller this guard
  -- must not apply to: the STOP webhook's whole job is to write these
  -- two fields.
  if auth.uid() is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.sms_opted_out_at = null;
    new.sms_consent_at = case when wants_sms then now() else null end;
    return new;
  end if;

  -- Whatever the request said about these two, start from what is on
  -- file. Only the branch below may move them.
  new.sms_opted_out_at = old.sms_opted_out_at;
  new.sms_consent_at = old.sms_consent_at;

  if wants_sms then
    -- Turning texts on, either for the first time or after a STOP.
    -- Re-stamped rather than kept, because the consent that matters is
    -- the most recent one.
    if old.channel not in ('sms', 'both')
       or old.sms_opted_out_at is not null
       or old.sms_consent_at is null then
      new.sms_consent_at = now();
    end if;
    new.sms_opted_out_at = null;
  end if;

  -- Switching back to email keeps both, deliberately: the record of a
  -- past consent, and of a past STOP, outlives the preference.

  return new;
end;
$$;

drop trigger if exists notification_preferences_protect
  on public.notification_preferences;
drop trigger if exists notification_preferences_protect_insert
  on public.notification_preferences;
drop trigger if exists notification_preferences_consent
  on public.notification_preferences;
create trigger notification_preferences_consent
  before insert or update on public.notification_preferences
  for each row execute function public.set_notification_consent();

-- Left over from an earlier shape of this migration; dropped so a
-- re-run cannot leave two generations of guard on the table.
drop function if exists public.protect_notification_opt_out();
drop function if exists public.protect_notification_opt_out_insert();

-- ─── the spend ceiling ──────────────────────────────────────────────────
-- An email that goes out twice costs nothing. A text that goes out twice
-- costs twice, which is why the verification endpoint has had a limiter
-- in the database since 0012 while the message endpoint counts rows it
-- already has. Notifications fire from server code rather than from a
-- member's own action, so the thing being guarded against is not abuse
-- so much as a loop: a bug that sends the same notification repeatedly
-- would otherwise be discovered on the bill.

create table if not exists public.sms_sends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,
  -- A text is billed per segment: 160 characters of GSM-7, but only 70
  -- of anything outside it, which is every Hebrew message. Recorded so
  -- the cap counts cost rather than messages.
  segments int not null default 1,
  created_at timestamptz not null default now()
);

create index if not exists sms_sends_user_idx
  on public.sms_sends (user_id, created_at desc);
create index if not exists sms_sends_created_idx
  on public.sms_sends (created_at);

-- RLS on with no policies: unreachable under any key but the service
-- role, exactly like phone_verification_attempts.
alter table public.sms_sends enable row level security;

-- Checks the ceilings and records the send in one statement, so two
-- concurrent notifications can't both pass a check only one should.
-- Returns {allowed: bool, reason: text}.
--
-- Called with the service role from server code, so the member is named
-- rather than read from auth.uid() — there is no session here. That is
-- also why nothing but the service role may execute it: the argument is
-- "charge this to that member", which no member may say.
create or replace function public.record_sms_send(
  target_user uuid,
  send_kind text,
  send_segments int default 1
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  per_user_day int;
  site_day int;
begin
  if target_user is null then
    return json_build_object('allowed', false, 'reason', 'no_recipient');
  end if;

  select coalesce(sum(segments), 0) into per_user_day
    from public.sms_sends
    where user_id = target_user and created_at > now() - interval '1 day';

  select coalesce(sum(segments), 0) into site_day
    from public.sms_sends
    where created_at > now() - interval '1 day';

  -- Both are far above anything normal use produces. They are here so a
  -- runaway send is capped at pennies instead of discovered later.
  if per_user_day >= 12 then
    return json_build_object('allowed', false, 'reason', 'member_daily_cap');
  end if;

  if site_day >= 400 then
    return json_build_object('allowed', false, 'reason', 'site_daily_cap');
  end if;

  insert into public.sms_sends (user_id, kind, segments)
  values (target_user, send_kind, greatest(1, coalesce(send_segments, 1)));

  -- Opportunistic cleanup, as in record_phone_verification_attempt:
  -- rows past the widest window are dead weight, trimmed on roughly 1%
  -- of calls rather than paid for on every one.
  if random() < 0.01 then
    delete from public.sms_sends
      where created_at < now() - interval '30 days';
  end if;

  return json_build_object('allowed', true);
end;
$$;

revoke all on function public.record_sms_send(uuid, text, int)
  from public, anon, authenticated;
grant execute on function public.record_sms_send(uuid, text, int)
  to service_role;
