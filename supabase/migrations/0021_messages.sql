-- Messaging between matched learners.
--
-- A thread is not its own object. There is exactly one match per pair —
-- connect_requests already carries it, with a stable id — so messages
-- hang off that row rather than getting their own thread table keyed on a
-- pair of user ids.
--
-- That choice does the work of several features at once:
--   * Unmatching ends the conversation, because messages cascade from
--     connect_requests. No second cleanup path to forget.
--   * Blocking ends it too, via the trigger below, for the same reason.
--   * There is no way to hold a conversation with someone you are not
--     currently matched with, because there is nowhere to put one.

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  connect_request_id uuid not null
    references public.connect_requests(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  -- Set by the recipient when the thread is opened. Null means unread.
  read_at timestamptz
);

alter table public.messages enable row level security;

-- Deliberately no admin select policy. A moderation tool that can read
-- every private conversation is a different product from one that reads
-- reported ones; reported-thread access comes later, scoped to a report.

drop policy if exists "Matched users can read their thread" on public.messages;
create policy "Matched users can read their thread"
  on public.messages for select
  to authenticated
  using (
    exists (
      select 1 from public.connect_requests cr
      where cr.id = messages.connect_request_id
        and cr.status = 'accepted'
        and (cr.requester_id = auth.uid() or cr.recipient_id = auth.uid())
    )
  );

-- Insert requires being a participant AND being the sender: without the
-- second half, either party could post as the other.
drop policy if exists "Matched users can send in their thread" on public.messages;
create policy "Matched users can send in their thread"
  on public.messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.connect_requests cr
      where cr.id = messages.connect_request_id
        and cr.status = 'accepted'
        and (cr.requester_id = auth.uid() or cr.recipient_id = auth.uid())
    )
  );

-- Only the recipient marks a message read, and the trigger below limits
-- what that update may touch.
drop policy if exists "Recipients can mark messages read" on public.messages;
create policy "Recipients can mark messages read"
  on public.messages for update
  to authenticated
  using (
    sender_id <> auth.uid()
    and exists (
      select 1 from public.connect_requests cr
      where cr.id = messages.connect_request_id
        and cr.status = 'accepted'
        and (cr.requester_id = auth.uid() or cr.recipient_id = auth.uid())
    )
  );

-- An UPDATE policy grants the whole row, so without this a recipient
-- could rewrite the message they were sent.
create or replace function public.protect_message_body()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.id := old.id;
  new.connect_request_id := old.connect_request_id;
  new.sender_id := old.sender_id;
  new.body := old.body;
  new.created_at := old.created_at;
  return new;
end;
$$;

drop trigger if exists messages_protect_body on public.messages;
create trigger messages_protect_body
  before update on public.messages
  for each row
  execute function public.protect_message_body();

create index if not exists messages_thread_idx
  on public.messages (connect_request_id, created_at);

-- Counting unread per person is the query the Requests page and the nav
-- badge both run, so it gets its own partial index.
create index if not exists messages_unread_idx
  on public.messages (connect_request_id, sender_id)
  where read_at is null;

-- ─── blocking ends a match ──────────────────────────────────────────────
-- Blocking already prevented new requests, but left an existing match
-- standing — so the pair stayed matched, and would have stayed able to
-- message. Blocking someone you are matched with is the clearest possible
-- statement that the match is over.

create or replace function public.end_match_on_block()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.match_endings (
    participant_a, participant_b, matched_since, ended_by, ended_by_admin
  )
  select cr.requester_id, cr.recipient_id, cr.updated_at, new.blocker_id, false
  from public.connect_requests cr
  where cr.status = 'accepted'
    and (
      (cr.requester_id = new.blocker_id and cr.recipient_id = new.blocked_id)
      or (cr.requester_id = new.blocked_id and cr.recipient_id = new.blocker_id)
    );

  delete from public.connect_requests cr
  where cr.status = 'accepted'
    and (
      (cr.requester_id = new.blocker_id and cr.recipient_id = new.blocked_id)
      or (cr.requester_id = new.blocked_id and cr.recipient_id = new.blocker_id)
    );

  return new;
end;
$$;

drop trigger if exists blocks_end_match on public.blocks;
create trigger blocks_end_match
  after insert on public.blocks
  for each row
  execute function public.end_match_on_block();

revoke execute on function public.end_match_on_block() from public, anon, authenticated;
revoke execute on function public.protect_message_body() from public, anon, authenticated;
