import { getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import type { SupabaseClient } from "@supabase/supabase-js";
import { routing } from "@/i18n/routing";
import { sendEmail } from "@/lib/email";
import { countSegments, sendSms, smsAvailableFor } from "@/lib/sms";
import { renderEmailHtml, renderEmailText } from "@/lib/email-template";
import { SITE_URL } from "@/lib/site";

/**
 * Everything the site tells a member about. Each one is an email, a
 * text, or both, depending on what they chose.
 */
export type NotificationKind =
  | "connect_request"
  | "request_accepted"
  | "session_proposed"
  | "session_countered"
  | "session_confirmed"
  | "new_message";

export type NotificationChannel = "email" | "sms" | "both";

export interface DeliverResult {
  emailSent: boolean;
  smsSent: boolean;
  /** Why a channel did not go out, for the server log. */
  notes: string[];
  skipped?: "recipient_suspended" | "no_recipient";
}

/**
 * The new-message notification was written before the others and sits in
 * its own namespace under its own key names. Both are live copy, in four
 * languages, so they are mapped here rather than renamed.
 */
const EMAIL_COPY: Record<
  NotificationKind,
  { namespace: "Email" | "Emails"; prefix: string }
> = {
  connect_request: { namespace: "Email", prefix: "connect_request" },
  request_accepted: { namespace: "Email", prefix: "request_accepted" },
  session_proposed: { namespace: "Email", prefix: "session_proposed" },
  session_countered: { namespace: "Email", prefix: "session_countered" },
  session_confirmed: { namespace: "Email", prefix: "session_confirmed" },
  new_message: { namespace: "Emails", prefix: "newMessage" },
};

/**
 * People pick languages they speak, not an interface language, so their
 * first choice is the best signal we have about what to write to them in.
 */
function preferredLocale(languages: string[] | null | undefined): string {
  const first = (languages ?? []).find((l) => hasLocale(routing.locales, l));
  return first ?? routing.defaultLocale;
}

/**
 * Where a text points. Always the requests page, never the match itself:
 * the requests page already lists incoming requests, outgoing requests
 * and accepted good fits in one place, and a 36-character match id in
 * the link would push every Hebrew text from two billed segments to
 * three on its own. Email has no such budget and keeps its deep link.
 *
 * The scheme is dropped for the same reason — phones linkify a bare
 * domain, and "https://" is eight characters of a 70-character segment.
 */
function smsLink(locale: string): string {
  return `${SITE_URL.replace(/^https?:\/\//, "")}/${locale}/requests`;
}

interface Recipient {
  languages: string[] | null;
  suspended: boolean | null;
  phone: string | null;
  phone_verified: boolean | null;
}

interface Preference {
  channel: NotificationChannel;
  sms_opted_out_at: string | null;
}

/**
 * Sends one notification on whichever channels the recipient chose.
 *
 * Takes a service-role client because none of what it reads is visible
 * to the person who caused the notification: the recipient's address
 * lives in auth.users, and their channel preference is theirs alone
 * (migration 0034 gives notification_preferences no policy for anybody
 * else). Callers have already re-checked, against the database, that
 * the thing being announced actually happened.
 *
 * Never throws. Every caller is notifying somebody about an action that
 * has already succeeded.
 */
export async function deliver({
  admin,
  recipientId,
  kind,
  senderName,
  path,
}: {
  admin: SupabaseClient;
  recipientId: string;
  kind: NotificationKind;
  /** The other person's name, as the copy's {name}. */
  senderName: string;
  /** Where the email should land the reader, relative to the locale. */
  path: string;
}): Promise<DeliverResult> {
  const notes: string[] = [];

  const [{ data: recipientRow }, { data: preferenceRow }, { data: authUser }] =
    await Promise.all([
      admin
        .from("profiles")
        .select("languages, suspended, phone, phone_verified")
        .eq("id", recipientId)
        .maybeSingle(),
      admin
        .from("notification_preferences")
        .select("channel, sms_opted_out_at")
        .eq("id", recipientId)
        .maybeSingle(),
      admin.auth.admin.getUserById(recipientId),
    ]);

  const recipient = recipientRow as Recipient | null;

  // A suspended account shouldn't be pulled back in by notifications,
  // on either channel.
  if (recipient?.suspended) {
    return {
      emailSent: false,
      smsSent: false,
      notes,
      skipped: "recipient_suspended",
    };
  }

  const locale = preferredLocale(recipient?.languages);
  const copy = EMAIL_COPY[kind];
  const t = await getTranslations({ locale, namespace: copy.namespace });
  const tSms = await getTranslations({ locale, namespace: "Sms" });
  // "Someone" has lived in the Email namespace since the first
  // notification; both channels read it from there rather than keeping
  // two translations of one word.
  const tShared = await getTranslations({ locale, namespace: "Email" });
  const name = senderName || tShared("someone");

  // No row means email, which is what the site did before preferences
  // existed — so every member who has never opened the setting keeps
  // the behaviour they already had.
  const preference = (preferenceRow as Preference | null) ?? {
    channel: "email" as NotificationChannel,
    sms_opted_out_at: null,
  };

  const wantsEmail =
    preference.channel === "email" || preference.channel === "both";
  const wantsSms =
    preference.channel === "sms" || preference.channel === "both";

  let smsSent = false;

  if (wantsSms) {
    const reason = smsBlockedBecause(recipient, preference);
    const phone = recipient?.phone;

    if (reason || !phone) {
      notes.push(`sms_skipped_${reason ?? "no_number"}`);
    } else {
      smsSent = await sendSmsWithinCap({
        admin,
        recipientId,
        kind,
        phone,
        body: tSms(kind, { name, link: smsLink(locale) }),
        notes,
      });
    }
  }

  // The fallback is the point: somebody who chose texts only, and then
  // lost their verified number or replied STOP, must not quietly stop
  // hearing from the site altogether.
  const sendTheEmail = wantsEmail || !smsSent;

  let emailSent = false;

  if (sendTheEmail) {
    const to = authUser?.user?.email;

    if (!to) {
      notes.push("no_email_on_file");
      if (!smsSent) {
        return { emailSent: false, smsSent, notes, skipped: "no_recipient" };
      }
    } else {
      if (!wantsEmail) notes.push("email_sent_as_fallback");

      const content = {
        heading: t(`${copy.prefix}Heading`, { name }),
        paragraphs: [t(`${copy.prefix}Body`, { name })],
        action: { label: t(`${copy.prefix}Action`), path },
        footnote: t(`${copy.prefix}Footnote`),
      };

      const result = await sendEmail({
        to,
        subject: t(`${copy.prefix}Subject`, { name }),
        text: renderEmailText(content, locale),
        html: renderEmailHtml(content, locale),
      });

      emailSent = result.sent;
      if (!result.sent) notes.push(`email_failed_${result.reason}`);
    }
  }

  return { emailSent, smsSent, notes };
}

/**
 * The reasons a text does not go out to somebody who asked for one. Each
 * is a state they can see and act on in the settings card, which is why
 * they are named rather than collapsed into one failure.
 */
function smsBlockedBecause(
  recipient: Recipient | null,
  preference: Preference,
): string | null {
  if (preference.sms_opted_out_at) return "opted_out";
  if (!recipient?.phone_verified) return "not_verified";
  if (!recipient.phone) return "no_number";
  if (!smsAvailableFor(recipient.phone)) return "country_not_enabled";
  return null;
}

/**
 * Records the send before making it, so the cap cannot be raced, and so
 * a text that was refused never reaches the billed call. The same shape
 * as the verification limiter in 0012: checked and written in one
 * statement in the database, because serverless invocations share no
 * memory.
 */
async function sendSmsWithinCap({
  admin,
  recipientId,
  kind,
  phone,
  body,
  notes,
}: {
  admin: SupabaseClient;
  recipientId: string;
  kind: NotificationKind;
  phone: string;
  body: string;
  notes: string[];
}): Promise<boolean> {
  const segments = countSegments(body);

  const { data: gate, error } = await admin.rpc("record_sms_send", {
    target_user: recipientId,
    send_kind: kind,
    send_segments: segments,
  });

  if (error) {
    // Fail closed. Without a working cap every notification is a billed
    // message, so a broken gate must not become an open one — the email
    // fallback below still reaches them.
    notes.push(`sms_cap_unavailable_${error.message}`);
    return false;
  }

  const decision = gate as { allowed?: boolean; reason?: string } | null;

  if (!decision?.allowed) {
    notes.push(`sms_capped_${decision?.reason ?? "unknown"}`);
    return false;
  }

  const result = await sendSms({ to: phone, body });

  if (!result.sent) {
    notes.push(`sms_failed_${result.reason}`);
    return false;
  }

  return true;
}
