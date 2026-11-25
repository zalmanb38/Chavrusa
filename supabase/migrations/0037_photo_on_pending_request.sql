-- Let the recipient of a pending request see the requester's photo.
--
-- Until now an approved photo was released only on an accepted match
-- (0019). That left the one moment where a face actually helps — deciding
-- whether to accept a request from a stranger — as the only moment with
-- nothing to look at.
--
-- The release is deliberately one-directional and narrow:
--
--   * Only the recipient of the request gains anything. The requester
--     still cannot see the recipient's photo, because they chose to ask;
--     the recipient is the one being asked to judge.
--   * Only while the request is 'pending'. An 'admin_resolved' row is one
--     the recipient is no longer answering, and declining or unmatching
--     removes the row, so the release ends with the decision.
--   * Approval is unchanged: a photo still has to pass review first, and
--     Browse and suggestions are untouched.
--
-- Written as its own policy rather than widened into the match policy, so
-- that each release is readable on its own and one can be revoked without
-- disturbing the other.

drop policy if exists "Request recipients can see an approved photo" on public.profile_photos;
create policy "Request recipients can see an approved photo"
  on public.profile_photos for select
  to authenticated
  using (
    status = 'approved'
    and exists (
      select 1
      from public.connect_requests cr
      where cr.status = 'pending'
        and cr.requester_id = profile_photos.id
        and cr.recipient_id = (select auth.uid())
    )
  );

-- The policy's exists() looks up pending requests by requester, which is
-- the opposite direction from the recipient-first index the requests page
-- uses.
create index if not exists connect_requests_pending_requester_idx
  on public.connect_requests (requester_id, recipient_id)
  where status = 'pending';
