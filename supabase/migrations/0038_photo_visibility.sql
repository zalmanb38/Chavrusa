-- Let a member choose to show their photo on Browse.
--
-- Until now a photo was released on two narrow rules: an accepted match
-- (0019) and a pending request you are being asked to answer (0037).
-- Browse itself showed nothing. That is the right default — a face next
-- to a name in a public list is the one thing a member cannot take back
-- once strangers have seen it — but it is the wrong *only* answer: some
-- people are glad to be recognised, and a photo is often what makes
-- somebody feel able to reach out at all.
--
-- So the rule becomes the member's own, with the cautious answer as the
-- default:
--
--   photo_public = false  (default, and what every existing row gets)
--                         Browse and suggestions show a placeholder. The
--                         0019 and 0037 releases are unchanged.
--   photo_public = true   An approved photo is also visible to any
--                         signed-in member, which is what Browse and the
--                         suggestion cards read.
--
-- The flag lives on profiles rather than on profile_photos for two
-- reasons: Browse already reads profiles for every row it lists, so the
-- lists can tell public from private without a second query; and a
-- choice about yourself should survive replacing or removing the photo
-- it was made about.
--
-- Approval is untouched. A photo still has to pass review first, so
-- "public" is a member's consent to be seen, never a way around the
-- gate — and nothing here is visible to a signed-out visitor, whose
-- Browse is still the wall.

alter table public.profiles
  add column if not exists photo_public boolean not null default false;

-- ─── the release ────────────────────────────────────────────────────────
-- Its own policy, like 0037's, so each release can be read and revoked
-- without disturbing the others.

drop policy if exists "Members can see a photo its owner made public" on public.profile_photos;
create policy "Members can see a photo its owner made public"
  on public.profile_photos for select
  to authenticated
  using (
    status = 'approved'
    and exists (
      select 1
      from public.profiles p
      where p.id = profile_photos.id
        and p.photo_public
    )
  );

-- The policy's exists() is a primary-key lookup on profiles, so it needs
-- no index of its own; this one serves the other direction, the lists
-- asking "which of these people have an approved photo".
create index if not exists profile_photos_approved_idx
  on public.profile_photos (id)
  where status = 'approved';

-- ─── saving the choice ──────────────────────────────────────────────────
-- Not part of save_profile: the control sits with the photo, on its own
-- card, and /api/photos is already the one way in for everything about a
-- photo. The column is therefore written by the service role there, and
-- a member's direct write to it is reverted the way the moderation flags
-- are — a value with a privacy promise attached should have exactly one
-- code path that can set it.
create or replace function public.protect_privileged_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_service_role boolean := auth.role() = 'service_role';
  privileged boolean := is_service_role or public.is_admin();
begin
  -- Moderation flags: admins and our own server routes may change these.
  if not privileged then
    if new.phone_verified is distinct from old.phone_verified then
      new.phone_verified = old.phone_verified;
    end if;
    if new.suspended is distinct from old.suspended then
      new.suspended = old.suspended;
    end if;
    if new.is_active is distinct from old.is_active then
      new.is_active = old.is_active;
    end if;
    -- The member's own choice, but made through /api/photos (service
    -- role) so that the one thing able to turn a photo public is the
    -- control that says what turning it public means.
    if new.photo_public is distinct from old.photo_public then
      new.photo_public = old.photo_public;
    end if;
  end if;

  -- Derived from connect_requests, so the only honest value is the one
  -- the data says — whoever the writer is.
  if new.match_count is distinct from old.match_count then
    new.match_count = (
      select count(*)
      from public.connect_requests cr
      where cr.status = 'accepted'
        and (cr.requester_id = new.id or cr.recipient_id = new.id)
    );
  end if;

  -- is_admin is stricter: not even an existing admin can grant it through
  -- the API, so a compromised admin session can't mint more admins. That
  -- stays a deliberate service-role / SQL-editor action.
  if new.is_admin is distinct from old.is_admin and not is_service_role then
    new.is_admin = old.is_admin;
  end if;

  return new;
end;
$$;
