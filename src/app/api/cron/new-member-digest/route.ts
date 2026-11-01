import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { renderEmailHtml, renderEmailText } from "@/lib/email-template";
import { topicName } from "@/lib/topic-names";
import { isTopicKey } from "@/lib/profile-options";
import { routing } from "@/i18n/routing";

export const dynamic = "force-dynamic";

/**
 * At most this many emails per run. Not a throttle on the community —
 * it is the ceiling that keeps one run inside a serverless timeout, and
 * anybody past it is written to by the next run, since their
 * last_new_member_email_at is what decides.
 */
const MAX_PER_RUN = 200;

interface DigestRow {
  recipient_id: string;
  email: string;
  name: string;
  languages: string[] | null;
  new_member_count: number;
  shared_topics: string[] | null;
}

/**
 * People pick languages they speak, not an interface language, so their
 * first choice is the best signal we have about what to write to them
 * in. Same rule as /api/notify.
 */
function preferredLocale(languages: string[] | null | undefined): string {
  const first = (languages ?? []).find((l) => hasLocale(routing.locales, l));
  return first ?? routing.defaultLocale;
}

/**
 * The weekly "people have joined who learn what you learn" email.
 *
 * Fired by Vercel Cron (see vercel.json), which attaches
 * Authorization: Bearer $CRON_SECRET — the only thing standing between
 * this route and the public internet, since nobody is signed in when a
 * cron job runs.
 *
 * Deliberately inert until NEW_MEMBER_DIGEST_ENABLED is set to "true".
 * Everything can be deployed, the cron can fire, and nothing reaches
 * anybody's inbox until that is switched on on purpose.
 *
 * The email carries a count and the subjects it was counted over, never
 * a name or anything else identifying: new_member_digest() returns
 * nothing more than that, and the link sends the reader to Browse to
 * look for themselves.
 *
 * Each recipient's last_new_member_email_at is stamped only after their
 * own send succeeded, so a provider failure halfway through means those
 * people are picked up next run rather than skipped.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (process.env.NEW_MEMBER_DIGEST_ENABLED !== "true") {
    return NextResponse.json({ skipped: "disabled" });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    console.error("new-member-digest: service role not configured");
    return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
  }

  const { data, error } = await admin.rpc("new_member_digest");

  if (error) {
    console.error("new-member-digest: query failed", error);
    return NextResponse.json({ error: "query_failed" }, { status: 500 });
  }

  const rows = ((data ?? []) as DigestRow[]).slice(0, MAX_PER_RUN);
  const sentTo: string[] = [];
  let failed = 0;

  for (const row of rows) {
    const locale = preferredLocale(row.languages);
    const t = await getTranslations({ locale, namespace: "Emails" });

    // Both names, always, the way subjects are written everywhere else
    // on the site. Only keys still on offer survive isTopicKey, so a
    // subject retired since somebody chose it is left out rather than
    // written as its raw key.
    const subjects = (row.shared_topics ?? [])
      .filter(isTopicKey)
      .map((key) => topicName(key, locale))
      .join(", ");

    const content = {
      heading: t("newMembersHeading", { count: row.new_member_count }),
      paragraphs: [
        t("newMembersBody", { count: row.new_member_count, subjects }),
      ],
      action: { label: t("newMembersAction"), path: "/browse" },
      footnote: t("newMembersFootnote"),
    };

    const result = await sendEmail({
      to: row.email,
      subject: t("newMembersSubject", { count: row.new_member_count }),
      text: renderEmailText(content, locale),
      html: renderEmailHtml(content, locale),
    });

    if (result.sent) {
      sentTo.push(row.recipient_id);
    } else {
      failed += 1;
      console.error(
        `new-member-digest: not sent to ${row.recipient_id} (${result.reason})`,
      );
    }
  }

  // One write for everybody who actually received it. A failure here
  // means somebody hears about the same arrivals twice, which is the
  // right way round: the alternative is stamping first and silently
  // dropping a week.
  if (sentTo.length > 0) {
    const { error: stampError } = await admin
      .from("profiles")
      .update({ last_new_member_email_at: new Date().toISOString() })
      .in("id", sentTo);

    if (stampError) {
      console.error("new-member-digest: stamp failed", stampError);
    }
  }

  return NextResponse.json({
    candidates: rows.length,
    sent: sentTo.length,
    failed,
  });
}
