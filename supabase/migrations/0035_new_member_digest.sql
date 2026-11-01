-- "Three new people are learning what you learn."
--
-- Somebody who joins while the site is quiet sees a quiet site and has
-- no reason to come back. Every member recruited before the community is
-- full is lost that way, which is the expensive part of a slow start —
-- more expensive than the sign-ups themselves.
--
-- So: one email, at most once a week, naming how many people have joined
-- since we last wrote who learn at least one of the same subjects. No
-- names, no profiles, nothing identifying — a count and the subjects, and
-- a link to Browse, where the reader can see for themselves.
--
-- Two columns and one function. The sending itself is a cron route
-- (/api/cron/new-member-digest) that stays switched off until
-- NEW_MEMBER_DIGEST_ENABLED is set.
--
-- Safe to re-run throughout.

-- The preference. Default true, which is the honest default for a
-- digest nobody has been asked about yet — it is the only email of its
-- kind the site sends, it is capped at one a week, and the profile page
-- carries the switch to stop it.
alter table public.profiles
  add column if not exists new_member_emails boolean not null default true;

-- When we last wrote to this person. Also the window: the next email
-- counts arrivals since this moment, so nobody is told twice about the
-- same person and nobody is missed because a run was late.
alter table public.profiles
  add column if not exists last_new_member_email_at timestamptz;

-- ─── who to write to, and what to tell them ─────────────────────────────
-- security definer because it reads auth.users for the address, which no
-- client role can see, and because it has to count people the recipient
-- may not be able to read individually. It returns a count and a list of
-- subject keys — never a name, a city or an id of anybody counted.
--
-- Granted to service_role alone: the cron route is the only caller, and
-- nothing a signed-in member can reach needs it.

create or replace function public.new_member_digest(
  p_window interval default interval '7 days'
)
returns table (
  recipient_id uuid,
  email text,
  name text,
  languages text[],
  new_member_count bigint,
  shared_topics text[]
)
language sql
stable
security definer
set search_path = public
as $$
  with recipients as (
    select
      p.id,
      p.name,
      p.languages,
      p.topics,
      -- Never further back than the window, however long ago the last
      -- email was: a member who has not been written to since August
      -- should hear about this week, not about August.
      greatest(
        coalesce(p.last_new_member_email_at, now() - p_window),
        now() - p_window
      ) as since
    from public.profiles p
    where p.is_active
      and not p.suspended
      and p.name <> ''
      and p.new_member_emails
      and p.topics <> '{}'
  ),
  newcomers as (
    select p.id, p.topics, p.created_at
    from public.profiles p
    where p.is_active
      and not p.suspended
      and p.name <> ''
      -- Only people who can actually be found: an email that sends
      -- somebody to Browse has to be able to show them what it counted.
      and p.is_looking
  )
  select
    r.id,
    u.email::text,
    r.name,
    r.languages,
    count(distinct n.id)::bigint,
    -- The subjects they have in common, so the email can say which part
    -- of the reader's list has moved.
    (
      select coalesce(array_agg(distinct t.topic), '{}')
      from public.profiles np
      cross join lateral unnest(np.topics) as t(topic)
      where np.id in (
        select n2.id
        from newcomers n2
        where n2.id <> r.id
          and n2.created_at > r.since
          and n2.topics && r.topics
      )
      and t.topic = any (r.topics)
    )
  from recipients r
  join auth.users u on u.id = r.id
  join newcomers n
    on n.id <> r.id
   and n.created_at > r.since
   and n.topics && r.topics
  where u.email is not null
    and u.email_confirmed_at is not null
  group by r.id, u.email, r.name, r.languages
$$;

revoke all on function public.new_member_digest(interval)
  from public, anon, authenticated;
grant execute on function public.new_member_digest(interval) to service_role;

-- The window is measured against created_at on a few hundred rows today,
-- but it is the one predicate every run repeats.
create index if not exists profiles_created_at_idx
  on public.profiles (created_at desc)
  where is_active and is_looking and name <> '';
