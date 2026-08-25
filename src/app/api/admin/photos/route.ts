import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PHOTO_BUCKET } from "@/lib/photos";

/**
 * Approve or reject a queued photo.
 *
 * The is_admin check happens here on the server against the caller's own
 * session, not from anything the request body claims — the same rule the
 * admin pages follow. reviewed_by records which admin decided, so the
 * queue stays accountable once there's more than one of them.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { data: me } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!me?.is_admin) {
    // 404 rather than 403: no reason to confirm the route exists.
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const photoId = typeof body?.photoId === "string" ? body.photoId : "";
  const action = body?.action;
  const note = typeof body?.note === "string" ? body.note.slice(0, 500) : "";

  if (!photoId || (action !== "approve" && action !== "reject")) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const admin = createAdminClient();

  if (action === "reject") {
    // A rejected photo's file is deleted outright. Keeping it would mean
    // retaining an image already judged unsuitable, which serves nobody;
    // the row stays so the person sees the outcome and can re-upload.
    const { data: photo } = await admin
      .from("profile_photos")
      .select("storage_path")
      .eq("id", photoId)
      .maybeSingle();

    if (photo?.storage_path) {
      await admin.storage.from(PHOTO_BUCKET).remove([photo.storage_path]);
    }
  }

  // .select() so the response says which row changed. An UPDATE matching
  // nothing is not an error in PostgREST — it returns success with an
  // empty result — so without this a review that quietly hit no rows
  // would report success and leave the photo exactly where it was.
  const { data: updated, error } = await admin
    .from("profile_photos")
    .update({
      status: action === "approve" ? "approved" : "rejected",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      review_note: note,
    })
    .eq("id", photoId)
    .select("id, status");

  if (error) {
    console.error("Photo review failed", error);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  if (!updated || updated.length === 0) {
    console.error("Photo review matched no row", { photoId, action });
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, status: updated[0].status });
}
