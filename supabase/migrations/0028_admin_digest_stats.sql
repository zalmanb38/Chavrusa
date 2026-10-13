-- Stats for the daily admin-digest email.
--
-- Separate from admin_dashboard_stats() rather than reusing it: that
-- function gates on public.is_admin(), which checks auth.uid() against
-- an authenticated session — there is no such session behind a cron job,
-- only the service role. This one is gated by grant instead: nobody but
-- service_role can call it at all, so there is nothing for a row-level
-- check to add.

create or replace function public.admin_digest_stats()
returns json
language sql
security definer
stable
set search_path = public
as $$
  select json_build_object(
    'new_signups_24h', (
      select count(*) from public.profiles
      where created_at > now() - interval '24 hours'
    ),
    -- A row only carries one updated_at, so this reads "became accepted
    -- in the last 24h" rather than "has been accepted for exactly that
    -- long" — a match accepted weeks ago and never touched since won't
    -- show up here twice, and one that formed and was undone inside the
    -- same window won't show up at all, since unmatching deletes the row
    -- entirely (see 0020_unmatch.sql). Both are the right call for a
    -- "what happened since yesterday" digest.
    'new_connections_24h', (
      select count(*) from public.connect_requests
      where status = 'accepted' and updated_at > now() - interval '24 hours'
    ),
    'pending_reports', (
      select count(*) from public.reports where status = 'open'
    ),
    'pending_photos', (
      select count(*) from public.profile_photos where status = 'pending'
    ),
    'total_users', (select count(*) from public.profiles),
    'active_matches', (
      select count(*) from public.connect_requests where status = 'accepted'
    )
  );
$$;

revoke all on function public.admin_digest_stats() from public, anon, authenticated;
grant execute on function public.admin_digest_stats() to service_role;
