-- Wrapping auth.uid() in a subselect in the notification_preferences policies.
--
-- 0029 went through every policy in the schema and replaced a bare
-- auth.uid() with (select auth.uid()), so Postgres evaluates the caller's
-- id once per statement instead of once per row. 0034 added three new
-- policies and wrote them in the older form, which is what the performance
-- advisor's auth_rls_initplan lint now reports: they were the only three
-- left in the database calling it bare.
--
-- The three predicates are otherwise unchanged — own row only, in all
-- three directions, and still no select policy for anybody else — so this
-- migration changes how often the id is read, not who can read or write a
-- row. The column order follows 0029's own form, id first.

drop policy if exists "Members read their own notification preferences"
  on public.notification_preferences;
create policy "Members read their own notification preferences"
  on public.notification_preferences for select
  using (id = (select auth.uid()));

drop policy if exists "Members create their own notification preferences"
  on public.notification_preferences;
create policy "Members create their own notification preferences"
  on public.notification_preferences for insert
  with check (id = (select auth.uid()));

drop policy if exists "Members update their own notification preferences"
  on public.notification_preferences;
create policy "Members update their own notification preferences"
  on public.notification_preferences for update
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
