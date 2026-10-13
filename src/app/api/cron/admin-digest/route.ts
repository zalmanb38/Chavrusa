import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendAdminAlert } from "@/lib/admin-notify";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

interface DigestStats {
  new_signups_24h: number;
  new_connections_24h: number;
  pending_reports: number;
  pending_photos: number;
  total_users: number;
  active_matches: number;
}

function plural(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? "" : "s"}`;
}

/**
 * Fired once a day by Vercel Cron (see vercel.json). Vercel attaches
 * Authorization: Bearer $CRON_SECRET automatically when that env var is
 * set, which is the only thing standing between this route and the
 * public internet — there's no session to check, unlike every other
 * admin route, because nobody is signed in when a cron job runs.
 *
 * Reports and photo-review alerts already fire the moment they happen
 * (see /api/admin-notify and the photo upload route); this is the
 * standing summary underneath those — new signups and new connections
 * don't get their own alert, and the open-queue counts are a backstop
 * in case an immediate alert was ever missed or silently failed to send.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("admin_digest_stats");

  if (error) {
    console.error("admin-digest: stats query failed", error);
    return NextResponse.json({ error: "query_failed" }, { status: 500 });
  }

  const s = data as DigestStats;

  await sendAdminAlert({
    subject: `Chavrusa Link daily digest — ${plural(s.new_signups_24h, "signup")}, ${plural(s.pending_reports, "open report")}`,
    text: [
      "Since yesterday:",
      `  ${plural(s.new_signups_24h, "new signup")}`,
      `  ${plural(s.new_connections_24h, "new connection")}`,
      "",
      "Still open:",
      `  ${plural(s.pending_reports, "report")} awaiting review — ${SITE_URL}/en/admin/reports`,
      `  ${plural(s.pending_photos, "photo")} awaiting review — ${SITE_URL}/en/admin/photos`,
      "",
      `Overall: ${plural(s.total_users, "member")}, ${plural(s.active_matches, "active match")}.`,
    ].join("\n"),
  });

  return NextResponse.json({ sent: true, stats: s });
}
