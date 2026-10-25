-- A unique public handle, separate from the display name.
--
-- The display name (profiles.name) is deliberately not unique: 0017 made
-- it a first name and a last initial, so several people are legitimately
-- "Zalman B." and telling one of them their own name is taken would be
-- wrong. A handle is the opposite kind of thing — one owner, no accents,
-- no spaces — so it gets its own column rather than uniqueness being
-- bolted onto a field that is meant to repeat.
--
-- Optional: '' means "no handle", and the unique index is partial so any
-- number of profiles can sit at ''. The format is checked in the database
-- as well as in the form, because the form is not the only possible
-- caller of save_profile.

alter table public.profiles
  add column if not exists username text not null default '';

do $$
begin
  alter table public.profiles
    add constraint profiles_username_format
    check (username = '' or username ~ '^[a-z0-9_]{3,20}$');
exception
  when duplicate_object then null;
end;
$$;

-- Lowercase is enforced by the check above, so a plain unique index is
-- already case-insensitive in effect — no need for one on lower(username).
create unique index if not exists profiles_username_key
  on public.profiles (username)
  where username <> '';

-- ─── is it taken? ───────────────────────────────────────────────────────
-- security definer, and this is the whole reason the function exists: the
-- select policy on profiles hides inactive, suspended and blocking rows
-- from the caller, so the same question asked under RLS would answer
-- "available" for a handle that is in use and then fail on the insert.
--
-- The caller's own handle does not count as taken, so re-saving a profile
-- without touching the field doesn't report a clash with itself.

create or replace function public.username_taken(p_username text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.username = p_username
      and p.username <> ''
      and p.id is distinct from (select auth.uid())
  );
$$;

revoke all on function public.username_taken(text) from public, anon;
grant execute on function public.username_taken(text) to authenticated;

-- ─── three near misses ──────────────────────────────────────────────────
-- Mechanical on purpose: numbered variants of what the person typed,
-- then a few random suffixes so two people picking the same handle at the
-- same moment aren't both pushed onto "zalman_b1". The base is trimmed so
-- that base + suffix still fits the 20-character limit.
--
-- A base that sanitises down to fewer than 3 characters has nothing to
-- suggest from; the empty array tells the form to say the handle is
-- malformed instead of offering nonsense.

create or replace function public.username_suggestions(
  p_base text,
  p_count integer default 3
)
returns text[]
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  base text := regexp_replace(lower(coalesce(p_base, '')), '[^a-z0-9_]', '', 'g');
  suffixes text[] := '{}';
  suffix text;
  candidate text;
  found text[] := '{}';
begin
  if length(base) < 3 then
    return found;
  end if;

  for i in 1..9 loop
    suffixes := suffixes || i::text;
  end loop;
  for i in 1..9 loop
    suffixes := suffixes || ('_' || i::text);
  end loop;
  -- Enough random draws that a run of collisions still leaves three.
  for i in 1..20 loop
    suffixes := suffixes || floor(random() * 900 + 100)::text;
  end loop;

  foreach suffix in array suffixes loop
    candidate := left(base, 20 - length(suffix)) || suffix;

    if length(candidate) >= 3
      and candidate <> base
      and not (candidate = any (found))
      and not public.username_taken(candidate)
    then
      found := found || candidate;
      exit when array_length(found, 1) >= p_count;
    end if;
  end loop;

  return found;
end;
$$;

revoke all on function public.username_suggestions(text, integer) from public, anon;
grant execute on function public.username_suggestions(text, integer) to authenticated;

-- ─── what the form asks ─────────────────────────────────────────────────
-- One round trip per keystroke-after-a-pause, answering all three things
-- the field needs to show: whether the shape is valid, whether it is
-- free, and what else to try if it isn't.

create or replace function public.username_status(p_candidate text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  candidate text := lower(trim(coalesce(p_candidate, '')));
begin
  -- No suggestions for a malformed handle: the form is telling them the
  -- shape is wrong, and variants of something that can't be used are not
  -- an answer to that.
  if candidate = '' or candidate !~ '^[a-z0-9_]{3,20}$' then
    return jsonb_build_object('status', 'invalid', 'suggestions', '[]'::jsonb);
  end if;

  if public.username_taken(candidate) then
    return jsonb_build_object(
      'status', 'taken',
      'suggestions', to_jsonb(public.username_suggestions(candidate))
    );
  end if;

  return jsonb_build_object('status', 'available', 'suggestions', '[]'::jsonb);
end;
$$;

revoke all on function public.username_status(text) from public, anon;
grant execute on function public.username_status(text) to authenticated;

-- ─── saving it ──────────────────────────────────────────────────────────
-- Same function as 0026 with username added. Normalised here rather than
-- trusted from the payload, and the unique violation is turned into a
-- message the form can recognise: between the availability check and the
-- save, someone else can take the handle.

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
  new_username text := lower(trim(coalesce(p_profile->>'username', '')));
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  insert into public.profiles (
    id, name, username, languages, topics, topic_other, level, city, country,
    region, neighborhood, meeting_spot, preference, availability, age_range,
    study_languages, frequency, time_of_day, session_length, blurb,
    hidden_fields, display_name_set
  )
  values (
    uid,
    coalesce(p_profile->>'name', ''),
    new_username,
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
    coalesce((p_profile->>'display_name_set')::boolean, true)
  )
  on conflict (id) do update set
    name = excluded.name,
    username = excluded.username,
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
