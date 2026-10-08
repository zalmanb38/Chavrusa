-- Three unrelated fixes that all land in the database.

-- ─── saving a profile is one write, not three ───────────────────────────
-- The form wrote profiles, then profile_names, then profile_contacts, one
-- after another. A failure on the second or third left the first saved
-- and the rest not — a half-written profile, reported as a generic error,
-- with nothing to roll it back. A plpgsql function is a single
-- transaction, so now either all three land or none do.
--
-- security invoker, deliberately: RLS stays the one statement of who may
-- write what, rather than being restated here and drifting. The id comes
-- from auth.uid() rather than the payload, so the question of writing
-- someone else's row does not arise at all.
--
-- The columns are listed out rather than populated from the json
-- wholesale. jsonb_populate_record would be shorter and would also let a
-- caller set is_admin, suspended or phone_verified by adding a key.

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
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  insert into public.profiles (
    id, name, languages, topics, topic_other, level, city, country, region,
    neighborhood, meeting_spot, preference, availability, age_range,
    study_languages, frequency, time_of_day, session_length, blurb,
    hidden_fields, display_name_set
  )
  values (
    uid,
    coalesce(p_profile->>'name', ''),
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
end;
$$;

revoke all on function public.save_profile(jsonb, text, jsonb) from public, anon;
grant execute on function public.save_profile(jsonb, text, jsonb) to authenticated;

-- ─── reports have a ceiling ─────────────────────────────────────────────
-- Reporting was the one write in the app with no limit on it, while
-- phone codes, messages and even the public contact form all have one.
-- Two caps, for the two different abuses: one report per person per day
-- stops a report count being inflated by repetition, and ten an hour
-- stops the admin queue being flooded across many people.
--
-- security definer because the check has to see rows the reporter cannot:
-- there is no select policy on reports for the person who filed them, so
-- a count run as the caller would see nothing and wave everything through.

create index if not exists reports_reporter_recent_idx
  on public.reports (reporter_id, created_at desc);

create index if not exists reports_reporter_target_idx
  on public.reports (reporter_id, reported_id, created_at desc);

create or replace function public.report_rate_clear(p_reported uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    not exists (
      select 1 from public.reports r
      where r.reporter_id = auth.uid()
        and r.reported_id = p_reported
        and r.created_at > now() - interval '24 hours'
    )
    and (
      select count(*) from public.reports r
      where r.reporter_id = auth.uid()
        and r.created_at > now() - interval '1 hour'
    ) < 10;
$$;

revoke all on function public.report_rate_clear(uuid) from public, anon;
grant execute on function public.report_rate_clear(uuid) to authenticated;

drop policy if exists "Users can file reports as themselves" on public.reports;
create policy "Users can file reports as themselves"
  on public.reports for insert
  to authenticated
  with check (
    auth.uid() = reporter_id
    and public.report_rate_clear(reported_id)
  );

-- ─── indexes the admin panel and the requests page were missing ─────────
-- admin_list_users counts reports per profile with a correlated subquery,
-- and nothing indexed reports.reported_id — so every admin page load was
-- a sequential scan of reports once per user listed.

create index if not exists reports_reported_idx
  on public.reports (reported_id);

-- connect_requests carried a requester-leading unique index, which the
-- requests page cannot use: it reads the other direction, by recipient
-- and status.

create index if not exists connect_requests_recipient_status_idx
  on public.connect_requests (recipient_id, status, created_at desc);

-- ─── admin_list_users pages ─────────────────────────────────────────────
-- It returned every matching row. The window count rides along so the
-- page knows how many there are without a second query for it.

drop function if exists public.admin_list_users(text, text, text, text);

create or replace function public.admin_list_users(
  search text default '',
  filter_language text default '',
  filter_city text default '',
  filter_verified text default '',
  page_size integer default 50,
  page_offset integer default 0
)
returns table (
  id uuid,
  name text,
  email text,
  city text,
  languages text[],
  phone text,
  phone_verified boolean,
  is_active boolean,
  suspended boolean,
  is_admin boolean,
  created_at timestamptz,
  report_count bigint,
  total_count bigint
)
language sql
security definer
stable
set search_path = public
as $$
  with matching as (
    select
      p.id,
      p.name,
      u.email::text as email,
      p.city,
      p.languages,
      p.phone,
      p.phone_verified,
      p.is_active,
      p.suspended,
      p.is_admin,
      p.created_at,
      (select count(*) from public.reports r where r.reported_id = p.id)
        as report_count
    from public.profiles p
    left join auth.users u on u.id = p.id
    where public.is_admin()
      and (
        search = ''
        or p.name ilike '%' || search || '%'
        or u.email ilike '%' || search || '%'
        or p.city ilike '%' || search || '%'
      )
      and (filter_language = '' or p.languages @> array[filter_language])
      and (filter_city = '' or p.city ilike '%' || filter_city || '%')
      and (
        filter_verified = ''
        or (filter_verified = 'verified' and p.phone_verified)
        or (filter_verified = 'unverified' and not p.phone_verified)
        or (filter_verified = 'suspended' and p.suspended)
      )
  )
  select
    m.*,
    count(*) over () as total_count
  from matching m
  order by m.created_at desc
  limit greatest(1, least(page_size, 200))
  offset greatest(0, page_offset);
$$;

revoke all on function public.admin_list_users(text, text, text, text, integer, integer)
  from public, anon;
grant execute on function public.admin_list_users(text, text, text, text, integer, integer)
  to authenticated;
