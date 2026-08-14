-- Admin flag + admin access to reports, so a designated admin can review
-- reports inside the app instead of needing the Supabase dashboard.

alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- Users can update their own profile row (see 0001), which would otherwise
-- let anyone grant themselves is_admin via a raw API call. Silently revert
-- any client-driven change to is_admin; only a service-role / SQL editor
-- write (which bypasses this trigger's own update path is irrelevant here
-- since it runs as a different role) can actually change it.
create or replace function public.protect_is_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_admin is distinct from old.is_admin and auth.role() <> 'service_role' then
    new.is_admin = old.is_admin;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_is_admin on public.profiles;
create trigger profiles_protect_is_admin
  before update on public.profiles
  for each row
  execute function public.protect_is_admin();

-- security definer helper so policies can check "is the current user an
-- admin" without recursively re-evaluating profiles' own RLS policy.
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Admins can read every report (regular users still have no select policy
-- on reports at all — write-only for them, per 0001).
create policy "Admins can view all reports"
  on public.reports for select
  to authenticated
  using (public.is_admin());

-- Admins can read every profile (e.g. a reported user who has since gone
-- inactive or blocked the reporter), so the admin reports page can always
-- resolve reporter/reported names.
drop policy if exists "Profiles are viewable by authenticated users" on public.profiles;

create policy "Profiles are viewable by authenticated users"
  on public.profiles for select
  to authenticated
  using (
    id = auth.uid()
    or public.is_admin()
    or (
      is_active = true
      and not exists (
        select 1 from public.blocks b
        where b.blocker_id = profiles.id and b.blocked_id = auth.uid()
      )
    )
  );
