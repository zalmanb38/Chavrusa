-- Admin panel: account suspension, hardened privileged fields, and the
-- read models the admin pages need.

-- ─── suspension ─────────────────────────────────────────────────────────
-- Distinct from is_active: is_active is a soft "hide me" state, suspended
-- is an admin-imposed ban the user cannot lift themselves.

alter table public.profiles
  add column if not exists suspended boolean not null default false;

-- ─── privileged field guard ─────────────────────────────────────────────
-- SECURITY: 0001 lets users update their own profile row, and the 0006
-- trigger only guarded is_admin. That left phone_verified and is_active
-- self-writable — a user could call
--   supabase.from('profiles').update({ phone_verified: true })
-- and mark themselves verified without ever passing Twilio. A `suspended`
-- flag would be just as self-clearable. This widens the guard to every
-- privileged column: such changes are silently reverted unless the writer
-- is the service role (our server routes) or an admin.

create or replace function public.protect_privileged_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_service_role boolean := auth.role() = 'service_role';
  privileged boolean := is_service_role or public.is_admin();
begin
  -- Moderation flags: admins and our own server routes may change these.
  if not privileged then
    if new.phone_verified is distinct from old.phone_verified then
      new.phone_verified = old.phone_verified;
    end if;
    if new.suspended is distinct from old.suspended then
      new.suspended = old.suspended;
    end if;
  end if;

  -- is_admin is stricter: not even an existing admin can grant it through
  -- the API, so a compromised admin session can't mint more admins. That
  -- stays a deliberate service-role / SQL-editor action.
  if new.is_admin is distinct from old.is_admin and not is_service_role then
    new.is_admin = old.is_admin;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_protect_is_admin on public.profiles;
drop trigger if exists profiles_protect_privileged on public.profiles;

create trigger profiles_protect_privileged
  before update on public.profiles
  for each row
  execute function public.protect_privileged_profile_fields();

drop function if exists public.protect_is_admin();

-- ─── suspended users disappear from browse ──────────────────────────────

drop policy if exists "Profiles are viewable by authenticated users" on public.profiles;

create policy "Profiles are viewable by authenticated users"
  on public.profiles for select
  to authenticated
  using (
    id = auth.uid()
    or public.is_admin()
    or (
      is_active = true
      and suspended = false
      and not exists (
        select 1 from public.blocks b
        where b.blocker_id = profiles.id and b.blocked_id = auth.uid()
      )
    )
  );

-- ─── admin write/read access ────────────────────────────────────────────

drop policy if exists "Admins can delete any profile" on public.profiles;
create policy "Admins can delete any profile"
  on public.profiles for delete
  to authenticated
  using (public.is_admin());

-- 0009 gave admins update on connect_requests; the admin views also need
-- to read every match, not just their own.
drop policy if exists "Admins can view all connect requests" on public.connect_requests;
create policy "Admins can view all connect requests"
  on public.connect_requests for select
  to authenticated
  using (public.is_admin());

-- ─── admin read models ──────────────────────────────────────────────────
-- Email lives in auth.users, which RLS on public.profiles cannot reach.
-- These security-definer functions expose it to admins only — they return
-- nothing at all when the caller isn't an admin, so being callable by any
-- authenticated role is not a leak.

create or replace function public.admin_list_users(
  search text default '',
  filter_language text default '',
  filter_city text default '',
  filter_verified text default ''
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
  report_count bigint
)
language sql
security definer
stable
set search_path = public
as $$
  select
    p.id,
    p.name,
    u.email::text,
    p.city,
    p.languages,
    p.phone,
    p.phone_verified,
    p.is_active,
    p.suspended,
    p.is_admin,
    p.created_at,
    (select count(*) from public.reports r where r.reported_id = p.id) as report_count
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
  order by p.created_at desc;
$$;

revoke all on function public.admin_list_users(text, text, text, text) from public;
grant execute on function public.admin_list_users(text, text, text, text) to authenticated;

create or replace function public.admin_get_user_email(user_id uuid)
returns text
language sql
security definer
stable
set search_path = public
as $$
  select case
    when public.is_admin()
    then (select u.email::text from auth.users u where u.id = user_id)
  end;
$$;

revoke all on function public.admin_get_user_email(uuid) from public;
grant execute on function public.admin_get_user_email(uuid) to authenticated;

create or replace function public.admin_dashboard_stats()
returns json
language sql
security definer
stable
set search_path = public
as $$
  select case when public.is_admin() then json_build_object(
    'total_users', (select count(*) from public.profiles),
    'pending_reports', (select count(*) from public.reports),
    'signups_this_week', (
      select count(*) from public.profiles
      where created_at > now() - interval '7 days'
    ),
    'active_matches', (
      select count(*) from public.connect_requests where status = 'accepted'
    ),
    'verified_users', (
      select count(*) from public.profiles where phone_verified
    ),
    'suspended_users', (
      select count(*) from public.profiles where suspended
    ),
    'total_blocks', (select count(*) from public.blocks)
  ) end;
$$;

revoke all on function public.admin_dashboard_stats() from public;
grant execute on function public.admin_dashboard_stats() to authenticated;
