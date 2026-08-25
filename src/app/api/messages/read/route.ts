import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Mark everything the other person sent in this thread as read.
 *
 * Again on the caller's session: the update policy already restricts this
 * to the recipient, and the protect_message_body trigger limits an update
 * to read_at, so there is nothing for a privileged client to add.
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

  if (!requestId) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const { error } = await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("connect_request_id", requestId)
    .neq("sender_id", user.id)
    .is("read_at", null);

  if (error) {
    console.error("Marking thread read failed", error);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
