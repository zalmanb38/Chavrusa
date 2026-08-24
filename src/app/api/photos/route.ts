import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ALLOWED_PHOTO_TYPES,
  MAX_PHOTO_BYTES,
  PHOTO_BUCKET,
  extensionFor,
} from "@/lib/photos";
import { mayAutoApprove, moderateImage } from "@/lib/moderation";

/**
 * Upload or replace the signed-in user's photo.
 *
 * Writes go through the service role because profile_photos has no
 * insert/update policy: a user who could write that table could set their
 * own status to 'approved'. Keeping every write behind a route that
 * checks the session first means there is exactly one way in.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("photo");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "no_file" }, { status: 400 });
  }
  if (
    !ALLOWED_PHOTO_TYPES.includes(
      file.type as (typeof ALLOWED_PHOTO_TYPES)[number],
    )
  ) {
    return NextResponse.json({ error: "bad_type" }, { status: 400 });
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return NextResponse.json({ error: "too_large" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const admin = createAdminClient();

  // Path carries a timestamp so a replacement never collides with a
  // still-cached signed URL for the previous photo.
  const path = `${user.id}/${Date.now()}.${extensionFor(file.type)}`;

  const { error: uploadError } = await admin.storage
    .from(PHOTO_BUCKET)
    .upload(path, bytes, { contentType: file.type, upsert: false });

  if (uploadError) {
    console.error("Photo upload failed", uploadError);
    return NextResponse.json({ error: "upload_failed" }, { status: 500 });
  }

  const moderation = await moderateImage(bytes, file.type);

  // A photo the filter rejects is still stored and still queued: an admin
  // needs to see what was rejected to correct a false positive, and the
  // uploader deserves a decision a person can overturn.
  const status = mayAutoApprove(moderation.verdict) ? "approved" : "pending";

  const { data: previous } = await admin
    .from("profile_photos")
    .select("storage_path")
    .eq("id", user.id)
    .maybeSingle();

  const { error: rowError } = await admin.from("profile_photos").upsert({
    id: user.id,
    storage_path: path,
    status,
    moderation_verdict: moderation.verdict,
    moderation_detail: moderation.detail,
    uploaded_at: new Date().toISOString(),
    reviewed_by: null,
    reviewed_at: null,
    review_note: "",
  });

  if (rowError) {
    console.error("Photo row write failed", rowError);
    await admin.storage.from(PHOTO_BUCKET).remove([path]);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  // Only once the new row is safely written — dropping the old file any
  // earlier would leave a row pointing at nothing if the write failed.
  if (previous?.storage_path && previous.storage_path !== path) {
    await admin.storage.from(PHOTO_BUCKET).remove([previous.storage_path]);
  }

  return NextResponse.json({ status, verdict: moderation.verdict });
}

/** Remove the signed-in user's own photo. */
export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("profile_photos")
    .select("storage_path")
    .eq("id", user.id)
    .maybeSingle();

  if (existing?.storage_path) {
    await admin.storage.from(PHOTO_BUCKET).remove([existing.storage_path]);
  }
  await admin.from("profile_photos").delete().eq("id", user.id);

  return NextResponse.json({ ok: true });
}
