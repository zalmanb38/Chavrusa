-- Fix a bug: the profiles select policy hid a blocked profile from BOTH
-- directions, but the Blocked-users list needs the blocker to still be
-- able to read the name of someone they blocked (to display it) — RLS
-- silently returned no row for that embed, and the page crashed reading
-- .name off of it.
--
-- New behavior: hide profiles.id from auth.uid() only when profiles.id
-- blocked auth.uid() (protects the blocker's privacy/control from the
-- person they blocked). If auth.uid() is the one who did the blocking,
-- they can still read the row — Browse excludes those explicitly at the
-- application level instead, since that's a "don't show me in results"
-- preference rather than a privacy boundary the other person needs
-- enforced against them.

drop policy if exists "Profiles are viewable by authenticated users" on public.profiles;

create policy "Profiles are viewable by authenticated users"
  on public.profiles for select
  to authenticated
  using (
    id = auth.uid()
    or (
      is_active = true
      and not exists (
        select 1 from public.blocks b
        where b.blocker_id = profiles.id and b.blocked_id = auth.uid()
      )
    )
  );
