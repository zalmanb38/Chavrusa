-- Give admins the write access needed to actually act on a report from the
-- admin page: deactivate the reported profile (removes them from Browse
-- without deleting their account), and dismiss the report once handled.
--
-- Both are additive permissive policies alongside the existing owner-only
-- ones (Postgres OR's multiple permissive policies together), so regular
-- users' own update/delete rights are unaffected. Note that even though
-- this profiles update policy is broad (any column, any profile), the
-- profiles_protect_is_admin trigger (0006) still silently reverts any
-- client-driven change to is_admin regardless of who makes the request, so
-- an admin still can't grant themselves or anyone else admin this way.

create policy "Admins can update any profile"
  on public.profiles for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can dismiss reports"
  on public.reports for delete
  to authenticated
  using (public.is_admin());
