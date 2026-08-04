-- Chavrusa Match — initial schema
-- Run this in the Supabase SQL editor, or via `supabase db push`.

-- ─── profiles ────────────────────────────────────────────────────────────
-- One row per user, keyed by auth.users.id. Holds everything needed for
-- browsing/matching. Kept separate from auth.users so it can be safely
-- exposed to other authenticated users under RLS.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  languages text[] not null default '{}',
  topics text[] not null default '{}',
  level text check (level in ('beginner', 'intermediate', 'advanced')),
  city text not null default '',
  preference text not null default 'both'
    check (preference in ('remote', 'in_person', 'both')),
  availability text not null default '',
  phone text,
  phone_verified boolean not null default false,
  contact_whatsapp text,
  contact_zoom text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Note: the select policy for profiles is defined near the bottom of this
-- file, since it needs to reference public.blocks (defined further below).

create policy "Users can insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "Users can delete their own profile"
  on public.profiles for delete
  to authenticated
  using (id = auth.uid());

-- Keep updated_at current.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

-- Auto-create a blank profile row whenever a new auth user signs up, so the
-- app can always assume a profiles row exists for a logged-in user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ─── connect_requests ───────────────────────────────────────────────────
-- A "connect" request from one user to another. Once accepted, both users
-- are considered matched (status = 'accepted').

create table if not exists public.connect_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint connect_requests_no_self check (requester_id <> recipient_id),
  constraint connect_requests_unique_pair unique (requester_id, recipient_id)
);

alter table public.connect_requests enable row level security;

create trigger connect_requests_set_updated_at
  before update on public.connect_requests
  for each row
  execute function public.set_updated_at();

create policy "Users can view requests they sent or received"
  on public.connect_requests for select
  to authenticated
  using (auth.uid() = requester_id or auth.uid() = recipient_id);

create policy "Users can send requests as themselves"
  on public.connect_requests for insert
  to authenticated
  with check (auth.uid() = requester_id);

create policy "Recipients can respond, either party can update"
  on public.connect_requests for update
  to authenticated
  using (auth.uid() = requester_id or auth.uid() = recipient_id)
  with check (auth.uid() = requester_id or auth.uid() = recipient_id);

-- ─── blocks ─────────────────────────────────────────────────────────────

create table if not exists public.blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint blocks_no_self check (blocker_id <> blocked_id),
  constraint blocks_unique_pair unique (blocker_id, blocked_id)
);

alter table public.blocks enable row level security;

create policy "Users can view their own blocks"
  on public.blocks for select
  to authenticated
  using (auth.uid() = blocker_id);

create policy "Users can create their own blocks"
  on public.blocks for insert
  to authenticated
  with check (auth.uid() = blocker_id);

create policy "Users can remove their own blocks"
  on public.blocks for delete
  to authenticated
  using (auth.uid() = blocker_id);

-- ─── reports ────────────────────────────────────────────────────────────
-- Write-only from the client; review happens via the Supabase dashboard or
-- a service-role admin tool, so there is intentionally no select policy.

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  created_at timestamptz not null default now(),
  constraint reports_no_self check (reporter_id <> reported_id)
);

alter table public.reports enable row level security;

create policy "Users can file reports as themselves"
  on public.reports for insert
  to authenticated
  with check (auth.uid() = reporter_id);

-- ─── profiles select policy ────────────────────────────────────────────
-- Defined here (rather than next to the table) because it references
-- public.blocks. Anyone signed in can browse active profiles that haven't
-- blocked them (or vice versa); everyone can always see their own row
-- regardless of status.

create policy "Profiles are viewable by authenticated users"
  on public.profiles for select
  to authenticated
  using (
    id = auth.uid()
    or (
      is_active = true
      and not exists (
        select 1 from public.blocks b
        where (b.blocker_id = profiles.id and b.blocked_id = auth.uid())
           or (b.blocker_id = auth.uid() and b.blocked_id = profiles.id)
      )
    )
  );
