-- Count of real, visible members, for the soft-launch progress banner.
-- Same population as subject_counts() — active, phone-verified, named,
-- not suspended — so the number on the homepage never claims more than
-- what Browse actually shows.

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
    and p.phone_verified
    and p.name <> ''
    and not p.suspended
$$;

grant execute on function public.active_member_count() to anon, authenticated;
