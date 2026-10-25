-- Two corrections to 0030, found in review.

-- ─── omitting the key must not erase a handle ───────────────────────────
-- 0030's save_profile wrote `username` from the payload unconditionally,
-- so any caller that left the key out would blank a handle the person had
-- already chosen. The form sends it, so nothing was lost — but that made
-- "send every key or lose data" a contract every future caller had to
-- know about, which is the kind of thing that is discovered by losing
-- someone's handle.
--
-- Now an absent key means "leave it alone" and an explicitly empty one
-- means "clear it", which are different intentions and now say so. The
-- same reasoning does not extend to the other columns: they have been
-- payload-or-default since 0026, the form sends them all, and changing
-- that silently here would be a second, unreviewed behaviour change.

-- ─── stable was a lie ───────────────────────────────────────────────────
-- username_suggestions calls random(), and username_status calls it in
-- turn, so neither is stable. Postgres allows the marking but is entitled
-- to call a stable function once per statement and reuse the answer, so
-- the label promised something the body does not deliver. Both become
-- volatile, which is what they always were. username_taken really is
-- stable and keeps the marking.

create or replace function public.username_suggestions(
  p_base text,
  p_count integer default 3
)
returns text[]
language plpgsql
volatile
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

create or replace function public.username_status(p_candidate text)
returns jsonb
language plpgsql
volatile
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
    coalesce((p_profile->>'display_name_set')::boolean, true)
  )
  on conflict (id) do update set
    name = excluded.name,
    -- The one column that survives being left out of the payload.
    username = coalesce(new_username, public.profiles.username),
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
