-- Prevent sending a connect request to (or from) someone you've blocked or
-- who has blocked you. The `profiles` select policy already hides blocked
-- users from browse results, but without this, a request could still be
-- inserted directly via the API using a previously-known user id.

drop policy if exists "Users can send requests as themselves" on public.connect_requests;

create policy "Users can send requests as themselves"
  on public.connect_requests for insert
  to authenticated
  with check (
    auth.uid() = requester_id
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = requester_id and b.blocked_id = recipient_id)
         or (b.blocker_id = recipient_id and b.blocked_id = requester_id)
    )
  );
