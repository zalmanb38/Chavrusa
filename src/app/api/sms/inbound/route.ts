import twilio from "twilio";
import { getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { createAdminClient } from "@/lib/supabase/admin";
import { routing } from "@/i18n/routing";
import { SITE_URL, SUPPORT_EMAIL } from "@/lib/site";

/**
 * Twilio's webhook for texts sent *to* our number.
 *
 * Only one conversation happens here, and it is not one the site starts:
 * somebody replying STOP to a notification, or HELP to find out what
 * this is. Carriers require both to work, and a member who replies STOP
 * and keeps getting texts is the one failure in this feature that cannot
 * be apologised for afterwards.
 *
 * Twilio's Messaging Service blocks the number at its end as well. This
 * route exists so the site knows too: otherwise the settings card would
 * go on showing "Text message" to somebody whose texts stopped arriving,
 * and the notification path would keep paying for messages the carrier
 * drops.
 */

const STOP_WORDS = new Set([
  "STOP",
  "STOPALL",
  "UNSUBSCRIBE",
  "CANCEL",
  "END",
  "QUIT",
  "REVOKE",
  "OPTOUT",
  "OPT-OUT",
]);

const START_WORDS = new Set(["START", "UNSTOP", "YES", "OPTIN", "OPT-IN"]);

const HELP_WORDS = new Set(["HELP", "INFO"]);

/** An empty TwiML document: received, nothing to say back. */
const NO_REPLY = '<?xml version="1.0" encoding="UTF-8"?><Response/>';

function twiml(body: string): string {
  // Only ever our own translated strings, but escaped anyway: a message
  // string is not a place to be able to inject markup.
  const escaped = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escaped}</Message></Response>`;
}

function xml(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

export async function POST(request: Request) {
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();

  if (!authToken) {
    // Nothing can be verified without it, and an unverified webhook is
    // one anybody on the internet can send. Refused rather than trusted.
    console.error("sms/inbound: TWILIO_AUTH_TOKEN is not set");
    return xml(NO_REPLY, 503);
  }

  const raw = await request.text();
  const params: Record<string, string> = {};
  for (const [key, value] of new URLSearchParams(raw)) {
    params[key] = value;
  }

  // Twilio signs the exact URL it was configured with, so the signature
  // is checked against the canonical public origin rather than against
  // whatever Host header arrived — a forwarded or spoofed host would
  // otherwise produce a mismatch at best and a bypass at worst.
  const signature = request.headers.get("x-twilio-signature") ?? "";
  const valid = twilio.validateRequest(
    authToken,
    signature,
    `${SITE_URL}/api/sms/inbound`,
    params,
  );

  if (!valid) {
    console.error("sms/inbound: bad Twilio signature");
    return xml(NO_REPLY, 403);
  }

  const from = (params.From ?? "").trim();
  // Carriers are not fussy about case or trailing punctuation, and
  // neither is anybody typing one word with a thumb.
  const word = (params.Body ?? "")
    .trim()
    .toUpperCase()
    .replace(/[.!?]+$/, "");

  if (!from) return xml(NO_REPLY);

  const isStop = STOP_WORDS.has(word);
  const isStart = START_WORDS.has(word);
  const isHelp = HELP_WORDS.has(word);

  if (!isStop && !isStart && !isHelp) {
    // Not a keyword. Nobody reads this inbox, so saying nothing is
    // honest; replying "we didn't understand" invites a conversation
    // that has no other end.
    return xml(NO_REPLY);
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    console.error("sms/inbound: service role not configured");
    return xml(NO_REPLY, 503);
  }

  // The verified number is unique across accounts (migration 0014), so
  // this identifies one member or nobody.
  const { data: profile } = await admin
    .from("profiles")
    .select("id, languages")
    .eq("phone", from)
    .eq("phone_verified", true)
    .maybeSingle();

  const owner = profile as { id: string; languages: string[] | null } | null;

  if (owner && (isStop || isStart)) {
    // Written with the service role, which is the only caller the
    // consent trigger in 0034 lets near these two columns.
    const { error } = await admin.from("notification_preferences").upsert(
      {
        id: owner.id,
        // A STOP puts them back on email rather than leaving them with
        // nothing: the notifications still matter, and they asked for
        // one channel to stop, not for all of them to.
        ...(isStop
          ? { channel: "email", sms_opted_out_at: new Date().toISOString() }
          : { sms_opted_out_at: null }),
      },
      { onConflict: "id" },
    );

    if (error) {
      console.error("sms/inbound: preference write failed", error);
    }
  }

  if (isHelp) {
    const locale =
      (owner?.languages ?? []).find((l) => hasLocale(routing.locales, l)) ??
      routing.defaultLocale;
    const t = await getTranslations({ locale, namespace: "Sms" });
    return xml(twiml(t("help", { email: SUPPORT_EMAIL })));
  }

  // Twilio's own opt-out handling sends the confirmation for STOP and
  // START, so adding one here would send two.
  return xml(NO_REPLY);
}
