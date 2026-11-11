import twilio from "twilio";

export interface SendSmsResult {
  sent: boolean;
  reason?: string;
  /** What the message would cost, in billed units. */
  segments: number;
}

/**
 * The dial-code prefixes texts may be sent to, longest first so that a
 * more specific prefix wins over a less specific one.
 *
 * Default: "+1" only. A text to a US number costs about a penny; one to
 * an Israeli number is roughly twenty times that, and Hebrew fits only
 * 70 characters per billed segment, so the same notification runs to
 * fifty cents or more. Email reaches those members instead until
 * WhatsApp exists as a third channel.
 *
 * "+1" is the North American Numbering Plan, so it also covers a number
 * of Caribbean countries whose rates sit between the two. Separating
 * them needs an area-code table rather than a dial code, which is a lot
 * of list to maintain for a handful of members; the per-member daily cap
 * in record_sms_send bounds what that can cost in the meantime.
 */
function allowedPrefixes(): string[] {
  const raw = process.env.SMS_ALLOWED_DIAL_CODES ?? "+1";
  return raw
    .split(",")
    .map((p) => p.trim())
    .filter((p) => /^\+\d+$/.test(p))
    .sort((a, b) => b.length - a.length);
}

/** Whether texts are offered to this number's country at all. */
export function smsAvailableFor(phone: string | null | undefined): boolean {
  if (!phone) return false;
  return allowedPrefixes().some((prefix) => phone.startsWith(prefix));
}

/**
 * The GSM 03.38 alphabet, which is what makes a text 160 characters
 * instead of 70. Anything outside it — Hebrew, in practice — forces the
 * whole message into UCS-2.
 *
 * The seven characters in the extension table ({ } [ ] ~ ^ \ and the
 * euro sign) are counted as two below, which is what they cost.
 */
const GSM_BASIC =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?" +
  "¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const GSM_EXTENDED = "^{}\\[~]|€";

/**
 * How many billed segments a body costs.
 *
 * Multipart messages lose characters to the concatenation header, which
 * is why the per-segment count drops once a message no longer fits in
 * one: 153 instead of 160, and 67 instead of 70.
 */
export function countSegments(body: string): number {
  let gsm = true;
  let units = 0;

  for (const char of body) {
    if (GSM_BASIC.includes(char)) {
      units += 1;
    } else if (GSM_EXTENDED.includes(char)) {
      units += 2;
    } else {
      gsm = false;
      break;
    }
  }

  if (!gsm) {
    // UCS-2 is billed per 16-bit unit, so an emoji or any other
    // character outside the basic plane counts twice. length is already
    // that count, where [...body].length would not be.
    const units16 = body.length;
    return units16 <= 70 ? 1 : Math.ceil(units16 / 67);
  }

  return units <= 160 ? 1 : Math.ceil(units / 153);
}

/**
 * Sends one text through Twilio Programmable Messaging. Server only —
 * the auth token must never reach the browser.
 *
 * The same contract as sendEmail: never throws, returns a reason
 * instead. Every caller is notifying somebody about an action that has
 * already succeeded, so a delivery failure must not turn into a failed
 * action.
 *
 * Twilio Verify, which sends the verification codes, is a different
 * product in the same account and is untouched by this: it sends codes
 * it generated itself, over routes Twilio registered. Sending our own
 * wording needs a Messaging Service of ours, which is the one new
 * variable — and with it unset, this reports "not configured" and the
 * email path carries on alone, exactly as sendEmail does with no Resend
 * key.
 */
export async function sendSms({
  to,
  body,
}: {
  to: string;
  body: string;
}): Promise<SendSmsResult> {
  const segments = countSegments(body);

  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID?.trim();

  if (!accountSid || !authToken) {
    return { sent: false, reason: "twilio_not_configured", segments };
  }
  if (!messagingServiceSid) {
    return { sent: false, reason: "no_messaging_service", segments };
  }
  // The same prefix check twilio-server.ts makes of its own identifiers:
  // a Verify service SID pasted into this variable would otherwise
  // surface much later as an opaque not-found from the API.
  if (!messagingServiceSid.startsWith("MG")) {
    return {
      sent: false,
      reason: `messaging_service_sid_should_start_with_MG_but_starts_with_${messagingServiceSid.slice(0, 2)}`,
      segments,
    };
  }

  if (!smsAvailableFor(to)) {
    return { sent: false, reason: "country_not_enabled", segments };
  }

  try {
    await twilio(accountSid, authToken).messages.create({
      messagingServiceSid,
      to,
      body,
    });
    return { sent: true, segments };
  } catch (err) {
    return {
      sent: false,
      reason: err instanceof Error ? err.message : "twilio_error",
      segments,
    };
  }
}
