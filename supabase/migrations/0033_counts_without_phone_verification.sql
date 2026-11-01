-- Public counts stop depending on phone verification.
--
-- A phone number is optional until launch (src/lib/verification.ts), so a
-- profile is discoverable as soon as it is active, named and not
-- suspended. These three functions still carried `phone_verified`, which
-- would have left every public number reporting a smaller community than
-- the site actually shows — including the homepage band counting towards
-- the first hundred members, which is the number the whole push is about.
--
-- Nothing else about them changes: same signatures, same grants, same
-- security-definer shape returning counts and nothing else. They stay
-- membership figures and still ignore the per-user "looking for a
-- chavrusa" switch, so the number never falls because somebody found a
-- chavrusa.
--
-- Safe to re-run; create or replace throughout.
--
-- Should verification become a requirement again, these can go back to
-- the 0023/0024/0027 definitions — or, better, be left alone: by then
-- every member will have a verified number and the two populations will
-- be the same set.

create or replace function public.subject_counts()
returns table (topic text, learners bigint)
language sql
stable
security definer
set search_path = public
as $$
  select t.topic, count(*)::bigint as learners
  from public.profiles p
  cross join lateral unnest(p.topics) as t(topic)
  where p.is_active
    and p.name <> ''
    and not p.suspended
  group by t.topic
$$;

create or replace function public.discoverable_learner_count()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::bigint
  from public.profiles p
  where p.is_active
    and p.name <> ''
    and not p.suspended
$$;

create or replace function public.active_member_count()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::bigint
  from public.profiles p
  where p.is_active
    and p.name <> ''
    and not p.suspended
$$;

-- create or replace keeps existing grants, but re-stating them makes the
-- file correct on a database where these functions do not exist yet.
grant execute on function public.subject_counts() to anon, authenticated;
grant execute on function public.discoverable_learner_count() to anon, authenticated;
grant execute on function public.active_member_count() to anon, authenticated;
