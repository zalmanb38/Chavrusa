/**
 * Fires a notification email for an action that has already been written
 * to the database.
 *
 * Deliberately not awaited by callers and never throws: the action has
 * succeeded by the time this runs, so a slow or failing mail provider must
 * not delay the interface or surface as an error to someone whose request
 * actually went through. The route re-checks every claim server-side, so
 * nothing here is trusted.
 */
export function notify(
  type: "connect_request" | "request_accepted" | "session_confirmed",
  id: string,
): void {
  void fetch("/api/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, id }),
    // Lets the browser finish the request even if the page navigates away
    // immediately afterwards, which router.refresh() often triggers.
    keepalive: true,
  }).catch(() => {
    // Nothing useful to do in the browser; the server logs failures.
  });
}
