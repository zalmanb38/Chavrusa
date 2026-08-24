import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { SITE_URL } from "@/lib/site";
import { routing } from "@/i18n/routing";

const TYPES = ["connect_request", "request_accepted", "session_confirmed"] as const;
type NotifyType = (typeof TYPES)[number];

/**
 * People pick languages they speak, not an interface language, so their
 * first choice is the best signal we have about what to write to them in.
 */
function preferredLocale(languages: string[] | null | undefined): string {
  const first = (languages ?? []).find((l) => hasLocale(routing.locales, l));
  return first ?? routing.defaultLocale;
}

interface Target {
  userId: string;
  senderName: string;
  /** Where the email should land the reader. */
  path: string;
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

  if (type === "session_confirmed") {
    const { data: row } = await supabase
      .from("study_sessions")
      .select(
        "id, status, connect_request_id, connect_requests!inner(requester_id, recipient_id)",
      )
      .eq("id", id)
      .maybeSingle();

    const session = row as unknown as {
      status: string;
      connect_request_id: string;
      connect_requests: { requester_id: string; recipient_id: string } | null;
    } | null;

    if (!session?.connect_requests) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const { requester_id, recipient_id } = session.connect_requests;
    const isParticipant = user.id === requester_id || user.id === recipient_id;

    if (!isParticipant || session.status !== "confirmed") {
      return NextResponse.json({ error: "not_applicable" }, { status: 409 });
    }

    const otherId = user.id === requester_id ? recipient_id : requester_id;

    const { data: me } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", user.id)
      .maybeSingle();

    target = {
      userId: otherId,
      senderName: me?.name ?? "",
      path: `/matches/${session.connect_request_id}`,
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

  // Email lives in auth.users, which the caller's own client can't read.
  const { data: recipientAuth } = await admin.auth.admin.getUserById(
    target.userId,
  );
  const to = recipientAuth?.user?.email;

  if (!to) {
    console.error(`notify: no email on file for ${target.userId}`);
    return NextResponse.json({ error: "no_recipient_email" }, { status: 404 });
  }

  // A suspended account shouldn't be pulled back in by notifications.
  const { data: recipientProfile } = await admin
    .from("profiles")
    .select("languages, suspended")
    .eq("id", target.userId)
    .maybeSingle();

  if (recipientProfile?.suspended) {
    return NextResponse.json({ skipped: "recipient_suspended" });
  }

  const locale = preferredLocale(recipientProfile?.languages);
  const t = await getTranslations({ locale, namespace: "Email" });
  const name = target.senderName || t("someone");
  const link = `${SITE_URL}/${locale}${target.path}`;

  const result = await sendEmail({
    to,
    subject: t(`${type}Subject`, { name }),
    text: `${t(`${type}Body`, { name })}\n\n${link}\n\n${t("signoff")}`,
  });

  if (!result.sent) {
    // The action itself already succeeded, so this is logged rather than
    // surfaced — but it must not vanish silently either.
    console.error(`notify: ${type} email not sent (${result.reason})`);
  }

  return NextResponse.json({ sent: result.sent });
}
