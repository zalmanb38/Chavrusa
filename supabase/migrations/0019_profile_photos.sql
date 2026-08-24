-- Optional profile photos, revealed only on a match and only after review.
--
-- Two gates, deliberately independent:
--   1. Approval — a photo is invisible to everyone until a human (or a
--      clean automated pass) approves it.
--   2. Match reveal — an approved photo is still only visible to someone
--      matched with its owner, the same rule that governs full names.
--
-- A photo therefore needs BOTH to be seen. This is not part of the
-- hidden_fields visibility system: that one is a preference, this is a
-- safety property, and mixing them would imply a photo could be exposed
-- earlier by choice.

-- ─── storage ────────────────────────────────────────────────────────────
-- A private bucket with no policies for `authenticated`: every read and
-- write goes through our own API routes on the service-role client, after
-- they have checked approval and match status themselves. Viewers receive
-- a short-lived signed URL, never a durable path.
--
-- Doing it this way keeps one authorization story instead of two — there
-- is no second set of storage policies that could drift out of step with
-- the table's RLS.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-photos',
  'profile-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ─── profile_photos ─────────────────────────────────────────────────────

create table if not exists public.profile_photos (
  id uuid primary key references public.profiles(id) on delete cascade,
  storage_path text not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),

  -- What the automated first pass concluded. 'error' and 'unconfigured'
  -- are distinct from 'borderline' on purpose: a check that never ran is
  -- not the same as one that ran and was unsure, and an admin reviewing
  -- the queue should be able to tell those apart.
  moderation_verdict text not null default 'unconfigured'
    check (moderation_verdict in
      ('unconfigured', 'clean', 'borderline', 'rejected', 'error')),
  moderation_detail text not null default '',

  uploaded_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  review_note text not null default ''
);

alter table public.profile_photos enable row level security;

-- Everything that changes a photo's state goes through an API route on
-- the service role, which is why there is no insert/update policy here:
-- a user cannot set their own status to 'approved', because a user cannot
-- write this table at all.

drop policy if exists "Users can see their own photo" on public.profile_photos;
create policy "Users can see their own photo"
  on public.profile_photos for select
  to authenticated
  using (id = auth.uid());

-- Approved, and matched. Both halves are required.
drop policy if exists "Matched users can see an approved photo" on public.profile_photos;
create policy "Matched users can see an approved photo"
  on public.profile_photos for select
  to authenticated
  using (
    status = 'approved'
    and exists (
      select 1
      from public.connect_requests cr
      where cr.status = 'accepted'
        and (
          (cr.requester_id = profile_photos.id and cr.recipient_id = auth.uid())
          or (cr.recipient_id = profile_photos.id and cr.requester_id = auth.uid())
        )
    )
  );

drop policy if exists "Admins can see all photos" on public.profile_photos;
create policy "Admins can see all photos"
  on public.profile_photos for select
  to authenticated
  using (public.is_admin());

-- reviewed_by references profiles rather than naming anyone, so granting
-- another account is_admin is all it takes to add a reviewer.

create index if not exists profile_photos_review_queue_idx
  on public.profile_photos (uploaded_at)
  where status = 'pending';
