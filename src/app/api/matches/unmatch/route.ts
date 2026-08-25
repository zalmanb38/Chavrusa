import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * End a match, from either participant or an admin.
 *
 * One route for both cases so the record written afterwards can't differ
 * depending on who ended it — the only difference is which check passes
 * and the ended_by_admin flag.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const requestId = typeof body?.requestId === "string" ? body.requestId : "";

  if (!requestId) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Read on the service role so the authorisation decision is made here
  // against a known row, rather than inferred from what RLS happened to
  // return for this caller.
  const { data: match, error: readError } = await admin
    .from("connect_requests")
    .select("id, requester_id, recipient_id, status, updated_at")
    .eq("id", requestId)
    .maybeSingle();

  if (readError) {
    console.error("Unmatch: could not read the match", readError);
    return NextResponse.json({ error: "read_failed" }, { status: 500 });
  }
  if (!match || match.status !== "accepted") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const isParticipant =
    match.requester_id === user.id || match.recipient_id === user.id;

  let isAdmin = false;
  if (!isParticipant) {
    const { data: me } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();
    isAdmin = Boolean(me?.is_admin);
  }

  if (!isParticipant && !isAdmin) {
    // 404 rather than 403: a stranger shouldn't learn the match exists.
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Recorded before the delete, because the row it describes is about to
  // stop existing. A failure here doesn't block the unmatch — refusing to
  // let someone leave a match because a log write failed would be the
  // wrong trade.
  const { error: logError } = await admin.from("match_endings").insert({
    participant_a: match.requester_id,
    participant_b: match.recipient_id,
    matched_since: match.updated_at,
    ended_by: user.id,
    ended_by_admin: !isParticipant && isAdmin,
  });

  if (logError) {
    console.error("Unmatch: could not record the ending", logError);
  }

  // .select() so a delete matching nothing is caught. In PostgREST that
  // returns success with an empty result, which is how a silent no-op
  // slipped through on the photo queue.
  const { data: deleted, error: deleteError } = await admin
    .from("connect_requests")
    .delete()
    .eq("id", requestId)
    .select("id");

  if (deleteError) {
    console.error("Unmatch failed", deleteError);
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
  if (!deleted || deleted.length === 0) {
    console.error("Unmatch matched no row", { requestId });
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
