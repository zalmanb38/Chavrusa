import { sendEmail } from "@/lib/email";
import { ADMIN_ALERT_EMAIL } from "@/lib/site";

/**
 * Sends one email to the admin inbox for something that needs attention:
 * a new report, a photo stuck in manual review, the daily digest.
 *
 * Never thrown by a caller mid-request for something else (the photo
 * upload route, the contact-style report alert): whatever already
 * happened — the upload, the report — has already succeeded, and a slow
 * or failing mail provider must not turn that into a failed request. A
 * delivery failure is logged instead, the same tradeoff notify() and the
 * contact route already make for their own emails.
 */
export async function sendAdminAlert({
  subject,
  text,
}: {
  subject: string;
  text: string;
}): Promise<void> {
  const result = await sendEmail({ to: ADMIN_ALERT_EMAIL, subject, text });
  if (!result.sent) {
    console.error(`admin-notify: "${subject}" not sent (${result.reason})`);
  }
}

/**
 * Fires an admin alert for an action a client component has already
 * written to the database — the admin-bound mirror of notify() in
 * src/lib/notify.ts. Not awaited by callers and never throws, for the
 * same reason notify() isn't: the write already succeeded by the time
 * this runs.
 */
export function notifyAdmin(type: "report_filed", id: string): void {
  void fetch("/api/admin-notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, id }),
    keepalive: true,
  }).catch(() => {
    // Nothing useful to do in the browser; the server logs failures.
  });
}
