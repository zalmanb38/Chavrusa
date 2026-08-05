-- Scheduling + contact handoff.
--
-- Contact details move out of `profiles` into their own table so RLS can
-- gate them separately: visible to the profile's owner, and to anyone who
-- has a confirmed study session with them — never to a browsing stranger,
-- even though row-level security on `profiles` itself allows browsing.
-- (Postgres RLS is row-level, not column-level, so leaving these columns
-- on `profiles` would have made them readable by anyone who can see the
-- row at all, i.e. every other browsing user.)

alter table public.profiles
  drop column if exists contact_whatsapp,
  drop column if exists contact_zoom;

create table if not exists public.profile_contacts (
  id uuid primary key references public.profiles(id) on delete cascade,
  whatsapp text not null default '',
  contact_phone text not null default '',
  zoom_link text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.profile_contacts enable row level security;

create trigger profile_contacts_set_updated_at
  before update on public.profile_contacts
  for each row
  execute function public.set_updated_at();

create policy "Users can manage their own contact info"
  on public.profile_contacts for all
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ─── study_sessions ─────────────────────────────────────────────────────
-- A proposed/confirmed learning time slot tied to a matched connect
-- request. Either matched user can propose a new slot; either can confirm
-- it, propose a different time (by updating the same row), or cancel it.

create table if not exists public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  connect_request_id uuid not null references public.connect_requests(id) on delete cascade,
  proposed_by uuid not null references public.profiles(id),
  scheduled_at timestamptz not null,
  status text not null default 'proposed'
    check (status in ('proposed', 'confirmed', 'cancelled')),
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.study_sessions enable row level security;

create trigger study_sessions_set_updated_at
  before update on public.study_sessions
  for each row
  execute function public.set_updated_at();

create policy "Matched participants can view their sessions"
  on public.study_sessions for select
  to authenticated
  using (
    exists (
      select 1 from public.connect_requests cr
      where cr.id = study_sessions.connect_request_id
        and (cr.requester_id = auth.uid() or cr.recipient_id = auth.uid())
    )
  );

create policy "Matched participants can propose sessions"
  on public.study_sessions for insert
  to authenticated
  with check (
    proposed_by = auth.uid()
    and exists (
      select 1 from public.connect_requests cr
      where cr.id = study_sessions.connect_request_id
        and cr.status = 'accepted'
        and (cr.requester_id = auth.uid() or cr.recipient_id = auth.uid())
    )
  );

create policy "Matched participants can update their sessions"
  on public.study_sessions for update
  to authenticated
  using (
    exists (
      select 1 from public.connect_requests cr
      where cr.id = study_sessions.connect_request_id
        and (cr.requester_id = auth.uid() or cr.recipient_id = auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.connect_requests cr
      where cr.id = study_sessions.connect_request_id
        and (cr.requester_id = auth.uid() or cr.recipient_id = auth.uid())
    )
  );

-- ─── profile_contacts select policy ────────────────────────────────────
-- Defined here because it needs both connect_requests and study_sessions.
-- Reveals a profile's contact info to the other side of any match that
-- has at least one confirmed session.

create policy "Confirmed session partners can view contact info"
  on public.profile_contacts for select
  to authenticated
  using (
    exists (
      select 1
      from public.study_sessions ss
      join public.connect_requests cr on cr.id = ss.connect_request_id
      where ss.status = 'confirmed'
        and (
          (cr.requester_id = profile_contacts.id and cr.recipient_id = auth.uid())
          or (cr.recipient_id = profile_contacts.id and cr.requester_id = auth.uid())
        )
    )
  );
