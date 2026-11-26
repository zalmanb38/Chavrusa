-- "People have joined who learn what you learn."
--
-- Somebody who joins while the site is quiet sees a quiet site and has
-- no reason to come back. Every member recruited before the community is
-- full is lost that way, which is the expensive part of a slow start —
-- more expensive than the sign-ups themselves.
--
-- So: one email, at most once a week, saying how many people have joined
-- since we last wrote who learn at least one of the same subjects. No
-- names, no profiles, nothing identifying — a count and the subjects,
-- and a link to Browse, where the reader can see for themselves.
--
-- Two columns and one function. The sending itself is a cron route
-- (/api/cron/new-member-digest) that stays switched off until
-- NEW_MEMBER_DIGEST_ENABLED is set.
--
-- Safe to re-run throughout.

-- ─── the preference ─────────────────────────────────────────────────────
-- On notification_preferences rather than profiles, for the reason 0034
-- gave when it created that table: profiles is readable by every signed-in
-- member, and how somebody chooses to be contacted is nobody else's
-- business. A missing row means the defaults, so every existing member
-- keeps this email without a row being created for them.
alter table public.notification_preferences
  add column if not exists new_member_emails boolean not null default true;

-- When we last wrote to this person. Also the window: the next email
-- counts arrivals since this moment, so nobody is told twice about the
-- same person and nobody is missed because a run was late.
alter table public.notification_preferences
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
      -- "Other" is free text behind a shared key: two people who both
      -- ticked it are not learning the same thing, so it never counts as
      -- a subject in common.
      array_remove(p.topics, 'other') as topics,
      -- Never further back than the window, however long ago the last
      -- email was: a member who has not been written to since August
      -- should hear about this week, not about August.
      greatest(
        coalesce(np.last_new_member_email_at, now() - p_window),
        now() - p_window
      ) as since
    from public.profiles p
    left join public.notification_preferences np on np.id = p.id
    where p.is_active
      and not p.suspended
      and p.name <> ''
      -- Somebody who has turned "looking for a chavrusa" off has said
      -- they are not in the market; this email is for the people still
      -- waiting.
      and p.is_looking
      and coalesce(np.new_member_emails, true)
      and array_remove(p.topics, 'other') <> '{}'
  ),
  newcomers as (
    select p.id, array_remove(p.topics, 'other') as topics, p.created_at
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
      from newcomers n2
      cross join lateral unnest(n2.topics) as t(topic)
      where n2.id <> r.id
        and n2.created_at > r.since
        and n2.topics && r.topics
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
