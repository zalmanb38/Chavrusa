-- An email address counts as a way to be reached.
--
-- Saving a profile requires at least one contact detail, and the three
-- on offer were WhatsApp, a phone number and a Zoom link. For most
-- people that means a phone number — so somebody who was just told that
-- verifying a number is optional (0033, src/lib/verification.ts) is
-- asked for one two screens later anyway, this time as a hard error.
--
-- An email address is the one thing every member already has and has
-- already confirmed, and it is the least exposing of the four. It is not
-- taken from the account automatically: the field starts empty and the
-- profile page offers to fill it in with the account address, so sharing
-- it stays a thing the person did on purpose.
--
-- Shared on exactly the same terms as the other three — only with a
-- learner after a session is mutually confirmed — because it goes in the
-- same row, under the same policies. Nothing about who can read
-- profile_contacts changes here.
--
-- Safe to re-run: add column if not exists, create or replace.

alter table public.profile_contacts
  add column if not exists contact_email text not null default '';

-- Unchanged from 0031 apart from the new column in the contacts upsert.

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

  insert into public.profile_contacts (
    id, whatsapp, contact_phone, zoom_link, contact_email
  )
  values (
    uid,
    coalesce(p_contacts->>'whatsapp', ''),
    coalesce(p_contacts->>'contact_phone', ''),
    coalesce(p_contacts->>'zoom_link', ''),
    -- Lower-cased on the way in: it is handed to a person to write to,
    -- and a capitalised copy of the same address only looks like a typo.
    lower(trim(coalesce(p_contacts->>'contact_email', '')))
  )
  on conflict (id) do update set
    whatsapp = excluded.whatsapp,
    contact_phone = excluded.contact_phone,
    zoom_link = excluded.zoom_link,
    contact_email = excluded.contact_email;
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
