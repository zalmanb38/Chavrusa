-- Let either side of an admin-resolved connect request remove it from
-- their own Requests page once they've seen it, rather than it sitting
-- there forever. Scoped strictly to status = 'admin_resolved' so this
-- can't be used to delete a live pending/accepted/declined request.

create policy "Participants can remove admin-resolved requests"
  on public.connect_requests for delete
  to authenticated
  using (
    (auth.uid() = requester_id or auth.uid() = recipient_id)
    and status = 'admin_resolved'
  );
