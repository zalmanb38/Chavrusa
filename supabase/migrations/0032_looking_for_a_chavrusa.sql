-- "Still looking for a chavrusa" — one flag the learner sets, and a
-- count of live matches the database keeps for them.
--
-- The question this answers: once two people are learning together, is
-- either of them still on Browse? Both answers are wrong on their own.
-- Leaving everyone on it shows strangers to someone who has stopped
-- looking; taking them off it assumes one chavrusa is all anyone wants,
-- when someone with a Gemara partner may still be looking for a Chumash
-- one.
--
-- So two separate facts, deliberately not one:
--
--   is_looking   what the person says about themselves. Off and they are
--                not in Browse or on the map at all — profile, matches
--                and sessions all stay exactly as they are. On is the
--                default, and being matched does not change it.
--   match_count  how many live matches they have. Derived, never typed:
--                it is what lets Browse mark someone as already learning
--                without claiming they are unavailable.
--
-- is_active already exists and is NOT this. It is the admin-side "hide
-- this account", which the user cannot set; this is the user's own switch
-- and the two have to be readable apart when one of them is off.

-- ─── the learner's own switch ───────────────────────────────────────────
-- Default true, and the same for every row that already exists: everyone
-- on Browse today is there because they are looking, and a migration that
-- quietly hid them all would be the opposite of what this is for.

alter table public.profiles
  add column if not exists is_looking boolean not null default true;

-- ─── live matches, counted ──────────────────────────────────────────────
-- Denormalised onto the profile on purpose. connect_requests is readable
-- only by the two people in it — correctly, it is nobody else's business
-- who asked whom — so a viewer cannot work this out from the table, and
-- the alternative is a security-definer function per Browse render. A
-- column is also the only form the filter below can be applied in SQL,
-- which keeps Browse at one query.
--
-- What it exposes is one number about a profile, to signed-in members
-- only: that this person is learning with someone. Not with whom.

alter table public.profiles
  add column if not exists match_count integer not null default 0;

create or replace function public.sync_match_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  -- Both sides of the row, before and after. An accepted request that
  -- changed hands would leave the old participants' counts stale
  -- otherwise; nothing does that today, and this costs nothing.
  touched uuid[] := '{}';
begin
  if tg_op <> 'INSERT' then
    touched := touched || array[old.requester_id, old.recipient_id];
  end if;
  if tg_op <> 'DELETE' then
    touched := touched || array[new.requester_id, new.recipient_id];
  end if;

  -- Recounted rather than incremented. An increment has to be right about
  -- every transition there is — pending→accepted, accepted→declined,
  -- the delete an unmatch does — and gets permanently wrong if it is
  -- wrong once. A count over an indexed handful of rows cannot drift.
  update public.profiles p
  set match_count = (
    select count(*)
    from public.connect_requests cr
    where cr.status = 'accepted'
      and (cr.requester_id = p.id or cr.recipient_id = p.id)
  )
  where p.id = any(touched);

  return null;
end;
$$;

drop trigger if exists connect_requests_sync_match_count on public.connect_requests;

create trigger connect_requests_sync_match_count
  after insert or update or delete on public.connect_requests
  for each row
  execute function public.sync_match_count();

-- Existing matches, which predate the trigger.
update public.profiles p
set match_count = c.live
from (
  select p2.id, count(cr.id) as live
  from public.profiles p2
  left join public.connect_requests cr
    on cr.status = 'accepted'
   and (cr.requester_id = p2.id or cr.recipient_id = p2.id)
  group by p2.id
) c
where c.id = p.id
  and p.match_count is distinct from c.live;

-- ─── match_count is not a field anyone may type ─────────────────────────
-- The 0011 guard reverts a user's write to a privileged column to its old
-- value. That is the wrong move for a derived one: the trigger above has
-- to be able to change it, and it runs as the browsing user rather than
-- the service role, so "revert to old" would undo the recount.
--
-- Recomputing instead settles both cases with one rule. A member who
-- posts match_count: 0 to hide the marker on their own profile gets the
-- true count written back, and the trigger's own update recomputes to the
-- value it was already setting.
create or replace function public.protect_privileged_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_service_role boolean := auth.role() = 'service_role';
  privileged boolean := is_service_role or public.is_admin();
begin
  -- Moderation flags: admins and our own server routes may change these.
  if not privileged then
    if new.phone_verified is distinct from old.phone_verified then
      new.phone_verified = old.phone_verified;
    end if;
    if new.suspended is distinct from old.suspended then
      new.suspended = old.suspended;
    end if;
    if new.is_active is distinct from old.is_active then
      new.is_active = old.is_active;
    end if;
  end if;

  -- Derived from connect_requests, so the only honest value is the one
  -- the data says — whoever the writer is.
  if new.match_count is distinct from old.match_count then
    new.match_count = (
      select count(*)
      from public.connect_requests cr
      where cr.status = 'accepted'
        and (cr.requester_id = new.id or cr.recipient_id = new.id)
    );
  end if;

  -- is_admin is stricter: not even an existing admin can grant it through
  -- the API, so a compromised admin session can't mint more admins. That
  -- stays a deliberate service-role / SQL-editor action.
  if new.is_admin is distinct from old.is_admin and not is_service_role then
    new.is_admin = old.is_admin;
  end if;

  return new;
end;
$$;

-- ─── saving the switch ──────────────────────────────────────────────────
-- Replaces 0031's save_profile, adding is_looking and nothing else. Like
-- username, it survives being left out of the payload rather than
-- defaulting to true: a caller that doesn't know about the field must not
-- silently put someone back on Browse.

create or replace function public.save_profile(
  p_profile jsonb,
  p_full_name text,
  p_contacts jsonb
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  -- null means the caller said nothing about the handle.
  new_username text := case
    when p_profile ? 'username'
      then lower(trim(coalesce(p_profile->>'username', '')))
    else null
  end;
  -- Same rule, same reason: null means "leave it as it is".
  new_is_looking boolean := case
    when p_profile ? 'is_looking'
      then (p_profile->>'is_looking')::boolean
    else null
  end;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  insert into public.profiles (
    id, name, username, languages, topics, topic_other, level, city, country,
    region, neighborhood, meeting_spot, preference, availability, age_range,
    study_languages, frequency, time_of_day, session_length, blurb,
    hidden_fields, display_name_set, is_looking
  )
  values (
    uid,
    coalesce(p_profile->>'name', ''),
    coalesce(new_username, ''),
    coalesce(array(select jsonb_array_elements_text(p_profile->'languages')), '{}'),
    coalesce(array(select jsonb_array_elements_text(p_profile->'topics')), '{}'),
    coalesce(p_profile->>'topic_other', ''),
    nullif(p_profile->>'level', ''),
    coalesce(p_profile->>'city', ''),
    coalesce(p_profile->>'country', ''),
    coalesce(p_profile->>'region', ''),
    coalesce(p_profile->>'neighborhood', ''),
    coalesce(p_profile->>'meeting_spot', ''),
    coalesce(p_profile->>'preference', 'both'),
    coalesce(p_profile->>'availability', ''),
    coalesce(p_profile->>'age_range', ''),
    coalesce(array(select jsonb_array_elements_text(p_profile->'study_languages')), '{}'),
    coalesce(p_profile->>'frequency', ''),
    coalesce(p_profile->>'time_of_day', ''),
    coalesce(p_profile->>'session_length', ''),
    coalesce(p_profile->>'blurb', ''),
    coalesce(array(select jsonb_array_elements_text(p_profile->'hidden_fields')), '{}'),
    coalesce((p_profile->>'display_name_set')::boolean, true),
    coalesce(new_is_looking, true)
  )
  on conflict (id) do update set
    name = excluded.name,
    -- The columns that survive being left out of the payload.
    username = coalesce(new_username, public.profiles.username),
    is_looking = coalesce(new_is_looking, public.profiles.is_looking),
    languages = excluded.languages,
    topics = excluded.topics,
    topic_other = excluded.topic_other,
    level = excluded.level,
    city = excluded.city,
    country = excluded.country,
    region = excluded.region,
    neighborhood = excluded.neighborhood,
    meeting_spot = excluded.meeting_spot,
    preference = excluded.preference,
    availability = excluded.availability,
    age_range = excluded.age_range,
    study_languages = excluded.study_languages,
    frequency = excluded.frequency,
    time_of_day = excluded.time_of_day,
    session_length = excluded.session_length,
    blurb = excluded.blurb,
    hidden_fields = excluded.hidden_fields,
    display_name_set = excluded.display_name_set;

  insert into public.profile_names (id, full_name)
  values (uid, coalesce(p_full_name, ''))
  on conflict (id) do update set full_name = excluded.full_name;

  insert into public.profile_contacts (id, whatsapp, contact_phone, zoom_link)
  values (
    uid,
    coalesce(p_contacts->>'whatsapp', ''),
    coalesce(p_contacts->>'contact_phone', ''),
    coalesce(p_contacts->>'zoom_link', '')
  )
  on conflict (id) do update set
    whatsapp = excluded.whatsapp,
    contact_phone = excluded.contact_phone,
    zoom_link = excluded.zoom_link;
exception
  when unique_violation then
    if sqlerrm like '%profiles_username_key%' then
      raise exception 'username_taken' using errcode = '23505';
    end if;
    raise;
  when check_violation then
    if sqlerrm like '%profiles_username_format%' then
      raise exception 'username_invalid' using errcode = '23514';
    end if;
    raise;
end;
$$;

revoke all on function public.save_profile(jsonb, text, jsonb) from public, anon;
grant execute on function public.save_profile(jsonb, text, jsonb) to authenticated;

-- ─── the public counts deliberately do NOT follow the flag ──────────────
-- discoverable_learner_count, active_member_count and subject_counts all
-- stay exactly as they were. They answer how many people are HERE, which
-- is not the same question as how many are looking right now: someone who
-- has found their chavrusas through the site is still a member of it, and
-- a homepage number that fell every time somebody succeeded would be
-- reporting the opposite of what happened.
--
-- The consequence, accepted on purpose: the signed-out wall's count can
-- exceed the number of cards Browse then shows. That is the honest way
-- round of the two — overstating what a visitor will find is a smaller
-- problem than a membership figure that drops when the product works.
