import { SUPPORT_EMAIL } from "@/lib/site";

export interface SendEmailResult {
  sent: boolean;
  reason?: string;
}

/**
 * Sends through Resend's HTTP API. Server-only — the key must never reach
 * the browser.
 *
 * Never throws: every caller here is sending a notification alongside an
 * action that has already succeeded, so a delivery failure must not turn
 * into a failed action. Callers log the reason instead.
 */
export async function sendEmail({
  to,
  subject,
  text,
  replyTo,
}: {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
}): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { sent: false, reason: "no_api_key" };

  const from = process.env.CONTACT_FROM_EMAIL ?? `noreply@chavrusalink.com`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `Chavrusa Link <${from}>`,
        to: [to],
        reply_to: replyTo ?? SUPPORT_EMAIL,
        subject,
        text,
      }),
    });

    if (res.ok) return { sent: true };

    // Resend explains rejections in the body — a bare status makes a
    // wrong from-address look identical to a bad key.
    const detail = await res.text().catch(() => "");
    return {
      sent: false,
      reason: `resend_${res.status}${detail ? `: ${detail.slice(0, 300)}` : ""}`,
    };
  } catch (err) {
    return {
      sent: false,
      reason: err instanceof Error ? err.message : "network_error",
    };
  }
}
