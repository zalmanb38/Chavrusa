-- A report can name the conversation it is about, and messages carry an
-- index for the rate-limit count.

-- ─── reports reference a thread ─────────────────────────────────────────
-- Reporting a profile and reporting something said in a conversation are
-- different acts. The first is about who someone is; the second is about
-- what they wrote, and an admin can't judge it without seeing it.
--
-- Nullable, because most reports are still about a profile.

alter table public.reports
  add column if not exists connect_request_id uuid
    references public.connect_requests(id) on delete set null;

-- on delete set null rather than cascade: if the pair unmatch, the thread
-- goes but the report must not. A report that vanishes when the reported
-- person ends the match would be worse than useless.

create index if not exists reports_thread_idx
  on public.reports (connect_request_id)
  where connect_request_id is not null;

-- ─── admins read a reported thread, and only a reported thread ──────────
-- The standing decision is that admins have no blanket access to private
-- conversations. This grants exactly one exception, scoped to threads
-- that someone has actually reported — the access follows the report, and
-- ends with it.

drop policy if exists "Admins can read reported threads" on public.messages;
create policy "Admins can read reported threads"
  on public.messages for select
  to authenticated
  using (
    public.is_admin()
    and exists (
      select 1 from public.reports r
      where r.connect_request_id = messages.connect_request_id
    )
  );

-- ─── rate limiting ──────────────────────────────────────────────────────
-- The cap is counted from the messages themselves rather than from a
-- separate attempts table: unlike an SMS, a message that fails to send
-- leaves no cost behind, so there is nothing to record but the sends that
-- actually happened.

create index if not exists messages_sender_recent_idx
  on public.messages (sender_id, created_at desc);
