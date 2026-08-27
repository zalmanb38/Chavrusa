-- Two small additions behind Round three's sign-in and browse-wall work.

-- ─── one-time account-linking notice ────────────────────────────────────
-- 3D asks for the linking banner to appear "once, on the next screen".
-- A query parameter alone would fire on every Google sign-in afterwards,
-- so the fact that it has been said is recorded against the profile.
--
-- Written by the auth callback on the service role, like the other
-- privileged profile fields.

alter table public.profiles
  add column if not exists auth_link_notice_at timestamptz;

-- ─── the browse wall's count ────────────────────────────────────────────
-- The wall's whole argument is a real number, and it is shown to people
-- who are not signed in — who cannot read profiles at all under RLS. So
-- the count comes from a security-definer function that returns one
-- integer and nothing else: no names, no ids, nothing to enumerate.
--
-- It counts the same population Browse shows, so the number on the wall
-- is the number behind it.

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
    and p.phone_verified
    and p.name <> ''
    and not p.suspended
$$;

grant execute on function public.discoverable_learner_count() to anon, authenticated;
