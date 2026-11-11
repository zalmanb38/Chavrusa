import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { deliver, type NotificationKind } from "@/lib/notifications";

const TYPES = [
  "connect_request",
  "request_accepted",
  "session_proposed",
  "session_confirmed",
] as const;
type NotifyType = (typeof TYPES)[number];

interface Target {
  userId: string;
  senderName: string;
  /** Where the email should land the reader. */
  path: string;
  /**
   * Overrides the notification kind when one request type can mean two
   * different things to the reader — proposing a time and countering one
   * are the same row in two states.
   */
  messageType?: NotificationKind;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const type = body?.type as NotifyType;
  const id = body?.id;

  if (!TYPES.includes(type) || typeof id !== "string" || !id) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  // Everything below is re-checked against the database rather than taken
  // from the request. The client says "this happened" — but only a row
  // that actually says so, with this caller on the right side of it, can
  // cause an email to be sent to someone else.
  let target: Target | null = null;

  if (type === "connect_request" || type === "request_accepted") {
    const { data: row } = await supabase
      .from("connect_requests")
      .select(
        "id, status, requester_id, recipient_id, requester:requester_id(name), recipient:recipient_id(name)",
      )
      .eq("id", id)
      .maybeSingle();

    const req = row as unknown as {
      status: string;
      requester_id: string;
      recipient_id: string;
      requester: { name: string } | null;
      recipient: { name: string } | null;
    } | null;

    if (!req) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    if (type === "connect_request") {
      // Only the person who sent it, and only while it's still pending.
      if (req.requester_id !== user.id || req.status !== "pending") {
        return NextResponse.json({ error: "not_applicable" }, { status: 409 });
      }
      target = {
        userId: req.recipient_id,
        senderName: req.requester?.name ?? "",
        path: "/requests",
      };
    } else {
      // Only the recipient, and only once they've actually accepted.
      if (req.recipient_id !== user.id || req.status !== "accepted") {
        return NextResponse.json({ error: "not_applicable" }, { status: 409 });
      }
      target = {
        userId: req.requester_id,
        senderName: req.recipient?.name ?? "",
        path: `/matches/${id}`,
      };
    }
  }

  if (type === "session_confirmed" || type === "session_proposed") {
    const { data: row } = await supabase
      .from("study_sessions")
      .select(
        "id, status, proposed_by, created_at, updated_at, connect_request_id, connect_requests!inner(requester_id, recipient_id)",
      )
      .eq("id", id)
      .maybeSingle();

    const session = row as unknown as {
      status: string;
      proposed_by: string;
      created_at: string;
      updated_at: string;
      connect_request_id: string;
      connect_requests: { requester_id: string; recipient_id: string } | null;
    } | null;

    if (!session?.connect_requests) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const { requester_id, recipient_id } = session.connect_requests;
    const isParticipant = user.id === requester_id || user.id === recipient_id;

    // A proposal is only announceable by the person who made it, and only
    // while it is still outstanding; a confirmation only once it is
    // actually confirmed.
    const applicable =
      type === "session_confirmed"
        ? session.status === "confirmed"
        : session.status === "proposed" && session.proposed_by === user.id;

    if (!isParticipant || !applicable) {
      return NextResponse.json({ error: "not_applicable" }, { status: 409 });
    }

    const otherId = user.id === requester_id ? recipient_id : requester_id;

    const { data: me } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", user.id)
      .maybeSingle();

    // Proposing a time and countering one arrive here identically, so the
    // difference is read from the row rather than taken from the caller:
    // a row that has been updated since it was written is a counter.
    const countered =
      type === "session_proposed" &&
      new Date(session.updated_at) > new Date(session.created_at);

    target = {
      userId: otherId,
      senderName: me?.name ?? "",
      path: `/matches/${session.connect_request_id}`,
      ...(countered ? { messageType: "session_countered" } : {}),
    };
  }

  if (!target) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    console.error("notify: service role not configured");
    return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
  }

  // From here the recipient's own preferences decide the channels: the
  // address, the verified number and the choice between them are all
  // things only the service role can see, and none of them are the
  // caller's business.
  const result = await deliver({
    admin,
    recipientId: target.userId,
    kind: target.messageType ?? type,
    senderName: target.senderName,
    path: target.path,
  });

  if (result.skipped === "recipient_suspended") {
    return NextResponse.json({ skipped: "recipient_suspended" });
  }

  if (result.skipped === "no_recipient") {
    console.error(`notify: nothing to send to for ${target.userId}`);
    return NextResponse.json({ error: "no_recipient" }, { status: 404 });
  }

  if (result.notes.length > 0) {
    // The action itself already succeeded, so this is logged rather than
    // surfaced — but it must not vanish silently either.
    console.error(`notify: ${type} (${result.notes.join("; ")})`);
  }

  return NextResponse.json({
    sent: result.emailSent || result.smsSent,
    email: result.emailSent,
    sms: result.smsSent,
  });
}
