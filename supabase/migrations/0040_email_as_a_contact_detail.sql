-- An email address as a way to be reached, in place of the Zoom link.
--
-- Saving a profile needs at least one contact detail, and the three on
-- offer were WhatsApp, a phone number and a Zoom link. For most people
-- that means a phone number — so somebody who has just been told that
-- verifying a number is optional (0033) is asked for one two screens
-- later anyway, this time as a hard error that refuses the save. A Zoom
-- link, meanwhile, is not something most people have to hand.
--
-- So: contact_email is added, and the form stops offering the Zoom link.
--
-- The zoom_link column and every value in it are left exactly as they
-- are. Somebody who saved one keeps it, and a confirmed chavrusa still
-- sees it; it just cannot be added or changed any more. Dropping the
-- column is a separate decision, to be taken when nobody is relying on
-- what is in it.
--
-- Safe to re-run throughout.

alter table public.profile_contacts
  add column if not exists contact_email text not null default '';

-- ─── save_profile, re-stated ────────────────────────────────────────────
-- 0032's definition with two changes to the contacts upsert at the end:
-- contact_email is written, and zoom_link survives being left out of the
-- payload the way username and is_looking already do. That second part
-- is what keeps a saved Zoom link alive now that the form no longer
-- sends one: without it, the first save by an existing member would
-- quietly blank it.

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

  insert into public.profile_contacts (
    id, whatsapp, contact_phone, zoom_link, contact_email
  )
  values (
    uid,
    coalesce(p_contacts->>'whatsapp', ''),
    coalesce(p_contacts->>'contact_phone', ''),
    coalesce(p_contacts->>'zoom_link', ''),
    coalesce(p_contacts->>'contact_email', '')
  )
  on conflict (id) do update set
    whatsapp = excluded.whatsapp,
    contact_phone = excluded.contact_phone,
    contact_email = excluded.contact_email,
    -- Left out of the payload means "leave it as it is", not "clear it":
    -- the form no longer sends a Zoom link, and a save must not take
    -- away the one somebody added while it was still on offer.
    zoom_link = case
      when p_contacts ? 'zoom_link'
        then coalesce(p_contacts->>'zoom_link', '')
      else public.profile_contacts.zoom_link
    end;
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
