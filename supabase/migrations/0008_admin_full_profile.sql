-- Let admins read contact info and block records for any profile, so the
-- admin profile detail page can show the full picture (contact info,
-- report count, block count) when reviewing a reported user.

create policy "Admins can view all contact info"
  on public.profile_contacts for select
  to authenticated
  using (public.is_admin());

create policy "Admins can view all blocks"
  on public.blocks for select
  to authenticated
  using (public.is_admin());
