-- Learner counts per subject, for the homepage subject cards.
--
-- The homepage is public and profiles are only readable when signed in,
-- so a signed-out visitor querying the table directly gets nothing. This
-- is a security-definer function that returns counts and nothing else:
-- no names, no ids, no way to enumerate anyone.
--
-- It counts the same population Browse shows — active, phone-verified,
-- named — so a card claiming 12 learners leads to a page with 12 on it.

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
    and p.phone_verified
    and p.name <> ''
    and not p.suspended
  group by t.topic
$$;

grant execute on function public.subject_counts() to anon, authenticated;
