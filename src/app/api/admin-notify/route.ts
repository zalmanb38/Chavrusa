import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendAdminAlert } from "@/lib/admin-notify";
import { SITE_URL } from "@/lib/site";

const TYPES = ["report_filed"] as const;
type NotifyType = (typeof TYPES)[number];

/**
 * Admin-bound counterpart of /api/notify: fires an email to the admin
 * inbox for something a signed-in user just wrote to the database, after
 * re-checking the claim against the row itself. The client says "I just
 * filed this report" — only a report that actually names this caller as
 * its reporter can cause an email to go out.
 *
 * English-only and plain text, unlike /api/notify's localized templates:
 * this reaches the site's own admin, not a member in their own language.
 */
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

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    console.error("admin-notify: service role not configured");
    return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
  }

  const { data: row } = await admin
    .from("reports")
    .select(
      "reason, reporter_id, reported:reported_id(name), reporter:reporter_id(name)",
    )
    .eq("id", id)
    .maybeSingle();

  const report = row as unknown as {
    reason: string;
    reporter_id: string;
    reported: { name: string } | null;
    reporter: { name: string } | null;
  } | null;

  // Only the person who filed it can trigger its alert — the same
  // self-only check /api/notify makes before emailing on anyone's behalf.
  if (!report || report.reporter_id !== user.id) {
    return NextResponse.json({ error: "not_applicable" }, { status: 409 });
  }

  const reporterName = report.reporter?.name || "Someone";
  const reportedName = report.reported?.name || "someone";

  await sendAdminAlert({
    subject: `New report: ${reporterName} reported ${reportedName}`,
    text: [
      `${reporterName} reported ${reportedName}.`,
      "",
      `Reason: ${report.reason}`,
      "",
      `Review: ${SITE_URL}/en/admin/reports`,
    ].join("\n"),
  });

  return NextResponse.json({ sent: true });
}
