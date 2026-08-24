-- Public display name vs. private full name, and an optional age range.
--
-- `profiles.name` keeps its column name and becomes explicitly the PUBLIC
-- display name — it is what Browse has always shown, so nothing about its
-- exposure changes. The full name moves to its own table, following the
-- same reasoning as profile_contacts in 0003: Postgres RLS is row-level,
-- not column-level, so a private field left on `profiles` is readable by
-- anyone allowed to see the row at all — which, on a browsing site, is
-- everyone.
--
-- profile_names is a separate table from profile_contacts rather than a
-- column on it because the two reveal at different moments: contact
-- details need a *confirmed session*, while a full name is revealed at
-- the match itself. One table can't hold two different gates, since a
-- SELECT policy grants the whole row.

-- ─── profile_names ──────────────────────────────────────────────────────

create table if not exists public.profile_names (
  id uuid primary key references public.profiles(id) on delete cascade,
  full_name text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.profile_names enable row level security;

drop trigger if exists profile_names_set_updated_at on public.profile_names;
create trigger profile_names_set_updated_at
  before update on public.profile_names
  for each row
  execute function public.set_updated_at();

drop policy if exists "Users can manage their own full name" on public.profile_names;
create policy "Users can manage their own full name"
  on public.profile_names for all
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Revealed on an accepted connect request — the moment two people are
-- matched — not merely on a request having been sent.
drop policy if exists "Matched users can view full name" on public.profile_names;
create policy "Matched users can view full name"
  on public.profile_names for select
  to authenticated
  using (
    exists (
      select 1
      from public.connect_requests cr
      where cr.status = 'accepted'
        and (
          (cr.requester_id = profile_names.id and cr.recipient_id = auth.uid())
          or (cr.recipient_id = profile_names.id and cr.requester_id = auth.uid())
        )
    )
  );

drop policy if exists "Admins can view full names" on public.profile_names;
create policy "Admins can view full names"
  on public.profile_names for select
  to authenticated
  using (public.is_admin());

-- ─── deriving a public name from a full one ─────────────────────────────
-- "Zalman Bernstein" -> "Zalman B."  |  "Rivka" -> "Rivka" (unchanged)
--
-- Deliberately mechanical: a starting point the person can edit, not an
-- attempt to be clever about every name shape in four languages. It gets
-- compound surnames wrong ("van der Berg" -> "van B."), which is why the
-- profile form asks people to check it.
--
-- Idempotent by construction: re-deriving "Zalman B." yields "Zalman B."
-- again. Together with the guards elsewhere in this file — if not exists,
-- on conflict do nothing, drop policy if exists — the whole migration can
-- be re-run without damage. The backfill in particular will not overwrite
-- a full name that is already stored.

create or replace function public.derive_display_name(full_name text)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when coalesce(trim(full_name), '') = '' then ''
    when array_length(string_to_array(trim(full_name), ' '), 1) < 2
      then trim(full_name)
    else split_part(trim(full_name), ' ', 1)
      || ' '
      || upper(left(
           split_part(
             trim(full_name),
             ' ',
             array_length(string_to_array(trim(full_name), ' '), 1)
           ), 1))
      || '.'
  end;
$$;

-- ─── backfill ───────────────────────────────────────────────────────────
-- Every existing profile's name is preserved in full, then the public
-- column is shortened.

insert into public.profile_names (id, full_name)
select id, name from public.profiles
on conflict (id) do nothing;

-- Marks whether the person has actually chosen their public name, as
-- opposed to inheriting the derived one. Drives the prompt on /profile;
-- nothing is hidden on the strength of it.
alter table public.profiles
  add column if not exists display_name_set boolean not null default false;

update public.profiles
set name = public.derive_display_name(name)
where public.derive_display_name(name) <> name;

-- ─── new signups ────────────────────────────────────────────────────────
-- Google hands us the account holder's real full name in user metadata,
-- and the original trigger put it straight into the public column. Split
-- it the same way as the backfill, so the exposure this migration closes
-- doesn't quietly reopen for every future sign-up.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  supplied_name text := coalesce(new.raw_user_meta_data ->> 'name', '');
begin
  insert into public.profiles (id, name)
  values (new.id, public.derive_display_name(supplied_name));

  insert into public.profile_names (id, full_name)
  values (new.id, supplied_name)
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.derive_display_name(text) from anon;

-- ─── age range ──────────────────────────────────────────────────────────
-- Optional, so '' is a valid value and means "not saying".

alter table public.profiles
  add column if not exists age_range text not null default ''
    check (age_range in (
      '', '18-22', '23-25', '26-30', '31-35', '36-40',
      '41-50', '51-60', '61-70', '71-80', '81+'
    ));

create index if not exists profiles_age_range_idx
  on public.profiles (age_range)
  where is_active and phone_verified and age_range <> '';
