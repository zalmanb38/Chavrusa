-- When an admin dismisses a report, any still-pending connect request
-- between the reporter and the reported user is resolved automatically
-- (rather than left "Pending" forever) and both sides see that it was
-- handled by an admin, instead of just silently vanishing.

alter table public.connect_requests
  drop constraint if exists connect_requests_status_check;

alter table public.connect_requests
  add constraint connect_requests_status_check
  check (status in ('pending', 'accepted', 'declined', 'admin_resolved'));

create policy "Admins can update any connect request"
  on public.connect_requests for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
