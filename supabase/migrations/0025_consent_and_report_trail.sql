-- Three places where the database trusted the client to enforce a rule
-- that only the UI knew about.

-- ─── study sessions: only the other person can confirm ──────────────────
-- Confirming a session is what reveals contact details (see the
-- profile_contacts policy in 0003). The "is it my turn" check lived only
-- in SessionCard, and the update policy asked nothing beyond "are you one
-- of the two people" — so anyone could propose a time and confirm it
-- themselves a moment later, and read their match's WhatsApp, phone and
-- Zoom without the match ever agreeing to anything.
--
-- The policy carries the rule that can be read off the new row: a row may
-- not end up confirmed by the person it says proposed it. The trigger
-- covers what a policy can't see, because RLS has no OLD row: without it,
-- the same person could rewrite proposed_by to the other side in the same
-- update that confirms, or confirm a session that was already cancelled.

drop policy if exists "Matched participants can update their sessions" on public.study_sessions;
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
    (status <> 'confirmed' or proposed_by <> auth.uid())
    and exists (
      select 1 from public.connect_requests cr
      where cr.id = study_sessions.connect_request_id
        and (cr.requester_id = auth.uid() or cr.recipient_id = auth.uid())
    )
  );

-- The insert policy let a new row arrive already confirmed, which skips
-- the other person just as completely. A session starts life proposed.
drop policy if exists "Matched participants can propose sessions" on public.study_sessions;
create policy "Matched participants can propose sessions"
  on public.study_sessions for insert
  to authenticated
  with check (
    proposed_by = auth.uid()
    and status = 'proposed'
    and exists (
      select 1 from public.connect_requests cr
      where cr.id = study_sessions.connect_request_id
        and cr.status = 'accepted'
        and (cr.requester_id = auth.uid() or cr.recipient_id = auth.uid())
    )
  );

create or replace function public.guard_study_session_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- No signed-in user means the service role or the SQL editor, neither
  -- of which is a participant acting on their own behalf.
  if auth.uid() is null then
    return new;
  end if;

  if new.connect_request_id is distinct from old.connect_request_id then
    raise exception 'A session cannot be moved to another match'
      using errcode = '42501';
  end if;

  -- Proposing a different time makes you the proposer, and nobody else:
  -- naming the other person as proposer is how a self-confirm would be
  -- dressed up as theirs.
  if new.proposed_by is distinct from old.proposed_by
     and (new.proposed_by <> auth.uid() or new.status <> 'proposed') then
    raise exception 'Only your own counter-proposal can change who proposed'
      using errcode = '42501';
  end if;

  if new.status = 'confirmed' and old.status is distinct from 'confirmed' then
    if old.status <> 'proposed'
       or old.proposed_by = auth.uid()
       or new.proposed_by is distinct from old.proposed_by
       or new.scheduled_at is distinct from old.scheduled_at then
      raise exception 'Only the other person can confirm a proposed time'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists study_sessions_guard_update on public.study_sessions;
create trigger study_sessions_guard_update
  before update on public.study_sessions
  for each row
  execute function public.guard_study_session_update();

-- ─── connect requests: only the recipient answers ───────────────────────
-- The same gap on the step before. "Either party can update" let the
-- person who sent a request mark it accepted themselves — a match, with
-- messaging, full name and photo, that the other person never agreed to.
-- Nothing in the app needs the requester to write their own request: the
-- recipient answers it (RespondButtons), admins resolve it under their
-- own policy (0009), and ending a match is a delete.

drop policy if exists "Recipients can respond, either party can update" on public.connect_requests;
create policy "Recipients can respond to pending requests"
  on public.connect_requests for update
  to authenticated
  using (auth.uid() = recipient_id and status = 'pending')
  with check (auth.uid() = recipient_id and status in ('accepted', 'declined'));

-- The policy checks recipient_id on the new row, so it alone would still
-- let a recipient swap requester_id for someone else and accept on that
-- third person's behalf. Who a request is between never changes.
create or replace function public.guard_connect_request_parties()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is not null
     and (new.requester_id is distinct from old.requester_id
          or new.recipient_id is distinct from old.recipient_id) then
    raise exception 'A request''s participants cannot be changed'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists connect_requests_guard_parties on public.connect_requests;
create trigger connect_requests_guard_parties
  before update on public.connect_requests
  for each row
  execute function public.guard_connect_request_parties();

-- ─── connect requests: asking again after a decline ─────────────────────
-- The unique constraint allowed one row per direction, ever, so a decline
-- was permanent: the requester's Connect button vanished for good, even
-- if the "no" was about timing or a profile that wasn't finished yet.
--
-- The constraint narrows to live rows. A declined row stays where it is —
-- the record that it happened, which is also what the cooldown counts
-- from — and a fresh pending row can sit beside it. What 0020 relied on
-- the constraint for still holds: one live request or match per
-- direction, never two.

alter table public.connect_requests
  drop constraint if exists connect_requests_unique_pair;

create unique index if not exists connect_requests_live_pair_idx
  on public.connect_requests (requester_id, recipient_id)
  where status <> 'declined';

-- Seven days from the most recent decline before the same person can
-- ask again. Long enough that a decline can't be answered by asking again
-- the same afternoon, short enough that "not right now" doesn't quietly
-- mean "never". Someone who wants it to mean never has blocking, which
-- the insert policy already honours. The browse page mirrors this value
-- in src/lib/connect.ts so it knows when to offer the button again.
create or replace function public.connect_request_cooldown_clear(
  p_requester uuid,
  p_recipient uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1 from public.connect_requests cr
    where cr.requester_id = p_requester
      and cr.recipient_id = p_recipient
      and cr.status = 'declined'
      and cr.updated_at > now() - interval '7 days'
  );
$$;

revoke all on function public.connect_request_cooldown_clear(uuid, uuid) from public;
grant execute on function public.connect_request_cooldown_clear(uuid, uuid) to authenticated;

drop policy if exists "Users can send requests as themselves" on public.connect_requests;
create policy "Users can send requests as themselves"
  on public.connect_requests for insert
  to authenticated
  with check (
    auth.uid() = requester_id
    and status = 'pending'
    and public.connect_request_cooldown_clear(requester_id, recipient_id)
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = requester_id and b.blocked_id = recipient_id)
         or (b.blocker_id = recipient_id and b.blocked_id = requester_id)
    )
  );

create index if not exists connect_requests_declined_idx
  on public.connect_requests (requester_id, recipient_id, updated_at desc)
  where status = 'declined';

-- ─── reports: dismissing keeps the record ───────────────────────────────
-- Dismissal was a delete, so someone reported and dismissed five times
-- looked exactly like someone never reported at all — the one pattern a
-- report count exists to surface. A dismissed report now stays, marked
-- with who dismissed it and when, the same trail photo review keeps.

alter table public.reports
  add column if not exists status text not null default 'open'
    check (status in ('open', 'dismissed')),
  add column if not exists reviewed_by uuid
    references public.profiles(id) on delete set null,
  add column if not exists reviewed_at timestamptz;

create index if not exists reports_open_idx
  on public.reports (created_at desc)
  where status = 'open';

-- Nothing deletes a report any more. Without a delete policy, even an
-- admin's own session can't remove one; only the SQL editor can.
drop policy if exists "Admins can dismiss reports" on public.reports;

-- Dismissal goes through a function rather than an update policy, so
-- reviewed_by is the caller's own id and not whatever the request said.
-- The pending request between the two people is resolved in the same
-- transaction, as the dismiss button used to do in two separate calls.
create or replace function public.admin_dismiss_report(report_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.reports%rowtype;
begin
  if not public.is_admin() then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  update public.reports
  set status = 'dismissed',
      reviewed_by = auth.uid(),
      reviewed_at = now()
  where id = report_id
    and status = 'open'
  returning * into r;

  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  update public.connect_requests cr
  set status = 'admin_resolved'
  where cr.status = 'pending'
    and (
      (cr.requester_id = r.reporter_id and cr.recipient_id = r.reported_id)
      or (cr.requester_id = r.reported_id and cr.recipient_id = r.reporter_id)
    );
end;
$$;

revoke all on function public.admin_dismiss_report(uuid) from public;
grant execute on function public.admin_dismiss_report(uuid) to authenticated;

-- 0022 opened a reported thread to admins on the understanding that "the
-- access follows the report, and ends with it". Dismissal used to end it
-- by deleting the report; now it has to say so.
drop policy if exists "Admins can read reported threads" on public.messages;
create policy "Admins can read reported threads"
  on public.messages for select
  to authenticated
  using (
    public.is_admin()
    and exists (
      select 1 from public.reports r
      where r.connect_request_id = messages.connect_request_id
        and r.status = 'open'
    )
  );

-- "Pending reports" on the dashboard means ones still waiting on someone.
-- admin_list_users' report_count deliberately keeps counting every report,
-- dismissed or not: that total is the repeat-problem signal.
create or replace function public.admin_dashboard_stats()
returns json
language sql
security definer
stable
set search_path = public
as $$
  select case when public.is_admin() then json_build_object(
    'total_users', (select count(*) from public.profiles),
    'pending_reports', (select count(*) from public.reports where status = 'open'),
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
