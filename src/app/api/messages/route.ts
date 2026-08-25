import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { MAX_MESSAGE_LENGTH } from "@/lib/messages";

/**
 * Send a message into a match's thread.
 *
 * Runs on the caller's own session rather than the service role: RLS
 * already states the rule exactly — participant of an accepted match, and
 * the sender is you — so letting the database enforce it keeps one
 * statement of the rule instead of two that could drift.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const requestId =
    typeof payload?.requestId === "string" ? payload.requestId : "";
  const body = typeof payload?.body === "string" ? payload.body.trim() : "";

  if (!requestId || !body) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (body.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: "too_long" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({
      connect_request_id: requestId,
      sender_id: user.id,
      body,
    })
    .select("id");

  if (error) {
    console.error("Message send failed", error);
    // An RLS refusal lands here too: not matched, or no longer matched.
    return NextResponse.json({ error: "send_failed" }, { status: 403 });
  }

  return NextResponse.json({ ok: true, id: data?.[0]?.id ?? null });
}
