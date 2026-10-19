-- Supabase advisor cleanup, three categories, none of them behavior changes:
--
-- 1. RLS policies that called auth.uid() directly instead of (select auth.uid()).
--    Postgres re-evaluates a bare function call once per row; wrapping it in a
--    subselect lets the planner evaluate it once per query instead. Same
--    access rules, cheaper at scale. Only the 25 policies the advisor
--    actually flagged are touched here — policies built on is_admin() were
--    not flagged (it isn't a bare auth.<fn>() call) and are left alone.
--
-- 2. Eight foreign-key columns with no covering index, which the advisor
--    flags because a lookup or cascading delete on them has to scan the
--    whole table.
--
-- 3. pg_trgm was installed in the public schema instead of its own. Moving
--    it is safe here: `extensions` already exists and is already on the
--    search_path (confirmed before writing this), so the existing trigram
--    index on profiles.blurb keeps resolving gin_trgm_ops without any other
--    change.

-- 1. RLS initplan fixes -------------------------------------------------

alter policy "Users can insert their own profile" on public.profiles
  with check (id = (select auth.uid()));

alter policy "Users can update their own profile" on public.profiles
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

alter policy "Users can delete their own profile" on public.profiles
  using (id = (select auth.uid()));

alter policy "Profiles are viewable by authenticated users" on public.profiles
  using (
    (id = (select auth.uid()))
    or is_admin()
    or (
      (is_active = true) and (suspended = false)
      and not exists (
        select 1 from blocks b
        where b.blocker_id = profiles.id and b.blocked_id = (select auth.uid())
      )
    )
  );

alter policy "Users can view requests they sent or received" on public.connect_requests
  using (((select auth.uid()) = requester_id) or ((select auth.uid()) = recipient_id));

alter policy "Participants can remove admin-resolved requests" on public.connect_requests
  using (
    (((select auth.uid()) = requester_id) or ((select auth.uid()) = recipient_id))
    and (status = 'admin_resolved'::text)
  );

alter policy "Participants can end their own match" on public.connect_requests
  using (
    (status = 'accepted'::text)
    and (((select auth.uid()) = requester_id) or ((select auth.uid()) = recipient_id))
  );

alter policy "Recipients can respond to pending requests" on public.connect_requests
  using (((select auth.uid()) = recipient_id) and (status = 'pending'::text))
  with check (
    ((select auth.uid()) = recipient_id)
    and (status = any (array['accepted'::text, 'declined'::text]))
  );

alter policy "Users can send requests as themselves" on public.connect_requests
  with check (
    ((select auth.uid()) = requester_id)
    and (status = 'pending'::text)
    and connect_request_cooldown_clear(recipient_id)
    and not exists (
      select 1 from blocks b
      where (b.blocker_id = connect_requests.requester_id and b.blocked_id = connect_requests.recipient_id)
         or (b.blocker_id = connect_requests.recipient_id and b.blocked_id = connect_requests.requester_id)
    )
  );

alter policy "Users can view their own blocks" on public.blocks
  using ((select auth.uid()) = blocker_id);

alter policy "Users can create their own blocks" on public.blocks
  with check ((select auth.uid()) = blocker_id);

alter policy "Users can remove their own blocks" on public.blocks
  using ((select auth.uid()) = blocker_id);

alter policy "Users can file reports as themselves" on public.reports
  with check (((select auth.uid()) = reporter_id) and report_rate_clear(reported_id));

alter policy "Users can manage their own contact info" on public.profile_contacts
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

alter policy "Confirmed session partners can view contact info" on public.profile_contacts
  using (
    exists (
      select 1 from study_sessions ss
      join connect_requests cr on cr.id = ss.connect_request_id
      where ss.status = 'confirmed'::text
        and (
          (cr.requester_id = profile_contacts.id and cr.recipient_id = (select auth.uid()))
          or (cr.recipient_id = profile_contacts.id and cr.requester_id = (select auth.uid()))
        )
    )
  );

alter policy "Users can manage their own full name" on public.profile_names
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

alter policy "Matched users can view full name" on public.profile_names
  using (
    exists (
      select 1 from connect_requests cr
      where cr.status = 'accepted'::text
        and (
          (cr.requester_id = profile_names.id and cr.recipient_id = (select auth.uid()))
          or (cr.recipient_id = profile_names.id and cr.requester_id = (select auth.uid()))
        )
    )
  );

alter policy "Users can see their own photo" on public.profile_photos
  using (id = (select auth.uid()));

alter policy "Matched users can see an approved photo" on public.profile_photos
  using (
    (status = 'approved'::text)
    and exists (
      select 1 from connect_requests cr
      where cr.status = 'accepted'::text
        and (
          (cr.requester_id = profile_photos.id and cr.recipient_id = (select auth.uid()))
          or (cr.recipient_id = profile_photos.id and cr.requester_id = (select auth.uid()))
        )
    )
  );

alter policy "Matched users can read their thread" on public.messages
  using (
    exists (
      select 1 from connect_requests cr
      where cr.id = messages.connect_request_id
        and cr.status = 'accepted'::text
        and (cr.requester_id = (select auth.uid()) or cr.recipient_id = (select auth.uid()))
    )
  );

alter policy "Matched users can send in their thread" on public.messages
  with check (
    (sender_id = (select auth.uid()))
    and exists (
      select 1 from connect_requests cr
      where cr.id = messages.connect_request_id
        and cr.status = 'accepted'::text
        and (cr.requester_id = (select auth.uid()) or cr.recipient_id = (select auth.uid()))
    )
  );

alter policy "Recipients can mark messages read" on public.messages
  using (
    (sender_id <> (select auth.uid()))
    and exists (
      select 1 from connect_requests cr
      where cr.id = messages.connect_request_id
        and cr.status = 'accepted'::text
        and (cr.requester_id = (select auth.uid()) or cr.recipient_id = (select auth.uid()))
    )
  );

alter policy "Matched participants can view their sessions" on public.study_sessions
  using (
    exists (
      select 1 from connect_requests cr
      where cr.id = study_sessions.connect_request_id
        and (cr.requester_id = (select auth.uid()) or cr.recipient_id = (select auth.uid()))
    )
  );

alter policy "Matched participants can update their sessions" on public.study_sessions
  using (
    exists (
      select 1 from connect_requests cr
      where cr.id = study_sessions.connect_request_id
        and (cr.requester_id = (select auth.uid()) or cr.recipient_id = (select auth.uid()))
    )
  )
  with check (
    ((status <> 'confirmed'::text) or (proposed_by <> (select auth.uid())))
    and exists (
      select 1 from connect_requests cr
      where cr.id = study_sessions.connect_request_id
        and (cr.requester_id = (select auth.uid()) or cr.recipient_id = (select auth.uid()))
    )
  );

alter policy "Matched participants can propose sessions" on public.study_sessions
  with check (
    (proposed_by = (select auth.uid()))
    and (status = 'proposed'::text)
    and exists (
      select 1 from connect_requests cr
      where cr.id = study_sessions.connect_request_id
        and cr.status = 'accepted'::text
        and (cr.requester_id = (select auth.uid()) or cr.recipient_id = (select auth.uid()))
    )
  );

-- 2. Missing foreign-key indexes ----------------------------------------

create index if not exists blocks_blocked_id_idx
  on public.blocks (blocked_id);
create index if not exists contact_messages_user_id_idx
  on public.contact_messages (user_id);
create index if not exists match_endings_ended_by_idx
  on public.match_endings (ended_by);
create index if not exists match_endings_participant_b_idx
  on public.match_endings (participant_b);
create index if not exists profile_photos_reviewed_by_idx
  on public.profile_photos (reviewed_by);
create index if not exists reports_reviewed_by_idx
  on public.reports (reviewed_by);
create index if not exists study_sessions_connect_request_id_idx
  on public.study_sessions (connect_request_id);
create index if not exists study_sessions_proposed_by_idx
  on public.study_sessions (proposed_by);

-- 3. Move pg_trgm out of public -------------------------------------------

alter extension pg_trgm set schema extensions;
