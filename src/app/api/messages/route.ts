import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { MAX_MESSAGE_LENGTH } from "@/lib/messages";
import { sendEmail } from "@/lib/email";
import { renderEmailHtml, renderEmailText } from "@/lib/email-template";
import { getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";

/**
 * Sending caps. Generous enough that a real back-and-forth never notices,
 * tight enough that the mailbox can't become a broadcast channel.
 *
 * Counted from the messages themselves rather than a separate attempts
 * table: unlike an SMS, a message that fails to send costs nothing, so
 * there is nothing to record but the sends that actually happened.
 */
const MAX_PER_HOUR = 60;
const MAX_PER_THREAD_PER_HOUR = 30;

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

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const [{ count: sentThisHour }, { count: sentInThread }] = await Promise.all([
    supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("sender_id", user.id)
      .gte("created_at", since),
    supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("sender_id", user.id)
      .eq("connect_request_id", requestId)
      .gte("created_at", since),
  ]);

  if ((sentThisHour ?? 0) >= MAX_PER_HOUR ||
      (sentInThread ?? 0) >= MAX_PER_THREAD_PER_HOUR) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
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

  // Notify only on the first unread in a thread. A message per email
  // would turn a conversation into a mailbox full of "you have a new
  // message"; one nudge, then silence until they have read it, says the
  // same thing once.
  await notifyIfFirstUnread(requestId, user.id);

  return NextResponse.json({ ok: true, id: data?.[0]?.id ?? null });
}

async function notifyIfFirstUnread(requestId: string, senderId: string) {
  try {
    const admin = createAdminClient();

    const { count: unread } = await admin
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("connect_request_id", requestId)
      .eq("sender_id", senderId)
      .is("read_at", null);

    // More than one means an earlier message is still unread, so they
    // have already been told.
    if ((unread ?? 0) !== 1) return;

    const { data: match } = await admin
      .from("connect_requests")
      .select("requester_id, recipient_id, status")
      .eq("id", requestId)
      .maybeSingle();

    if (!match || match.status !== "accepted") return;

    const recipientId =
      match.requester_id === senderId ? match.recipient_id : match.requester_id;

    const [{ data: recipient }, { data: sender }] = await Promise.all([
      admin
        .from("profiles")
        .select("name, languages, suspended")
        .eq("id", recipientId)
        .maybeSingle(),
      admin.from("profiles").select("name").eq("id", senderId).maybeSingle(),
    ]);

    if (!recipient || recipient.suspended) return;

    const { data: email } = await admin.rpc("admin_get_user_email", {
      user_id: recipientId,
    });
    if (typeof email !== "string" || !email) return;

    const locale =
      (recipient.languages ?? []).find((l: string) =>
        hasLocale(routing.locales, l),
      ) ?? routing.defaultLocale;

    const t = await getTranslations({ locale, namespace: "Emails" });
    const content = {
      heading: t("newMessageHeading", { name: sender?.name ?? "" }),
      paragraphs: [t("newMessageBody", { name: sender?.name ?? "" })],
      action: { label: t("newMessageAction"), path: `/matches/${requestId}` },
      footnote: t("newMessageFootnote"),
    };

    const result = await sendEmail({
      to: email,
      subject: t("newMessageSubject", { name: sender?.name ?? "" }),
      text: renderEmailText(content, locale),
      html: renderEmailHtml(content, locale),
    });

    if (!result.sent) {
      console.error("New-message email not sent", result.reason);
    }
  } catch (error) {
    // The message is already saved. A notification failure must not turn
    // a successful send into a failed one.
    console.error("New-message notification failed", error);
  }
}
