-- Lifting a STOP only when texts are actually turned on.
--
-- 0034's guard restored both timestamps from the row on file and then,
-- whenever the incoming channel wanted texts, cleared sms_opted_out_at.
-- But "wants texts" is read from the new row, and on an ordinary update
-- the channel is simply unchanged — so a member already set to 'sms' or
-- 'both' lifted their own STOP with any save at all, an unrelated
-- profile edit included, and had a fresh consent time stamped as though
-- they had asked for one.
--
-- Nothing the site itself does produces that state: the inbound webhook
-- writes channel = 'email' alongside the opt-out, and with the channel on
-- email the guard held. What lost a withdrawal was a row that ended up
-- opted out while the channel still said texts — a service-role write
-- that set only the stamp, or that upsert half-succeeding.
--
-- So the lift now follows the transition rather than the state: email (or
-- no row) to texts is a fresh opt-in and does clear a STOP, which is what
-- the settings card promises, and no other write touches either
-- timestamp. A member already on texts with no consent on file still gets
-- one stamped, since that is a record about them either way. Switching
-- back to email still keeps both stamps, as in 0034: the record of a past
-- consent, and of a past STOP, outlives the preference.
--
-- Checked against the live database, each case inside a transaction that
-- was then rolled back: a STOP survives a member's bare
-- `sms_opted_out_at = null`, survives a no-op write with the channel on
-- texts, and is still lifted when a member moves from email to 'both',
-- with sms_consent_at re-stamped.
--
-- Only the function changes. notification_preferences_consent calls it by
-- name, so the trigger stays exactly as 0034 created it. The body below is
-- character for character what was run against the live database, so
-- md5(prosrc) matches this file; 0034's three inline comments inside the
-- body are not repeated here for that reason, and what they said is above.

create or replace function public.set_notification_consent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  wants_sms boolean := new.channel in ('sms', 'both');
begin
  if auth.uid() is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.sms_opted_out_at = null;
    new.sms_consent_at = case when wants_sms then now() else null end;
    return new;
  end if;

  new.sms_opted_out_at = old.sms_opted_out_at;
  new.sms_consent_at = old.sms_consent_at;

  if wants_sms then
    if old.channel not in ('sms', 'both') then
      -- Actually turning texts on: a fresh opt-in, which does lift an
      -- earlier STOP. A STOP puts the row back on email, so this is the
      -- path a member takes when they choose texts again.
      new.sms_consent_at = now();
      new.sms_opted_out_at = null;
    elsif old.sms_consent_at is null then
      -- Already on texts with no consent on file: stamp it, and leave an
      -- opt-out nobody asked to lift alone.
      new.sms_consent_at = now();
    end if;
  end if;

  return new;
end;
$$;
