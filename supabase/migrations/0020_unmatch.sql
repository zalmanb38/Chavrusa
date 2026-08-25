-- Ending a match.
--
-- The match row is DELETED rather than moved to an 'ended' status, for
-- three reasons that all point the same way:
--
--   1. connect_requests carries a unique constraint on
--      (requester_id, recipient_id), and it's directional. An 'ended' row
--      would block the original requester from ever asking again, while
--      leaving the other direction free — an asymmetry with no meaning.
--   2. study_sessions cascade from connect_requests, so deleting takes the
--      old schedule with it. An 'ended' row would leave last month's
--      confirmed sessions to reappear if the pair ever rematched.
--   3. Visibility falls out for free: the RLS on profile_names and
--      profile_photos both require an *accepted* row to exist, so once
--      it's gone, full name and photo are hidden again with no second
--      mechanism to keep in step.
--
-- What deletion loses is history, which is why match_endings exists
-- below.

-- ─── match_endings ──────────────────────────────────────────────────────
-- A record that a match existed and ended, kept for admins only.
--
-- Not bookkeeping for its own sake: without it, someone could match,
-- read a full name and photo, unmatch, and rematch repeatedly, leaving
-- no trace anywhere. This is the only thing that would make that pattern
-- visible.

create table if not exists public.match_endings (
  id uuid primary key default gen_random_uuid(),
  participant_a uuid not null references public.profiles(id) on delete cascade,
  participant_b uuid not null references public.profiles(id) on delete cascade,
  matched_since timestamptz,
  ended_at timestamptz not null default now(),
  ended_by uuid references public.profiles(id) on delete set null,
  ended_by_admin boolean not null default false
);

alter table public.match_endings enable row level security;

-- Written only by the unmatch route on the service role, and read only by
-- admins. Participants get no policy: the point is a record they can't
-- quietly tidy away.
drop policy if exists "Admins can view match endings" on public.match_endings;
create policy "Admins can view match endings"
  on public.match_endings for select
  to authenticated
  using (public.is_admin());

create index if not exists match_endings_recent_idx
  on public.match_endings (ended_at desc);

create index if not exists match_endings_participants_idx
  on public.match_endings (participant_a, participant_b);

-- ─── deleting the match ─────────────────────────────────────────────────
-- The unmatch route runs on the service role, so these policies are not
-- what authorises an unmatch — the route checks the caller itself. They
-- exist so the data layer would refuse anything the route didn't sanction,
-- the same defence-in-depth the admin pages rely on.

drop policy if exists "Participants can end their own match" on public.connect_requests;
create policy "Participants can end their own match"
  on public.connect_requests for delete
  to authenticated
  using (
    status = 'accepted'
    and (auth.uid() = requester_id or auth.uid() = recipient_id)
  );

drop policy if exists "Admins can end any match" on public.connect_requests;
create policy "Admins can end any match"
  on public.connect_requests for delete
  to authenticated
  using (public.is_admin());
