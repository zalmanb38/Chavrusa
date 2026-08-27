import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import RespondButtons from "@/components/RespondButtons";
import UnblockButton from "@/components/UnblockButton";
import RemoveResolvedRequestButton from "@/components/RemoveResolvedRequestButton";
import UnmatchButton from "@/components/UnmatchButton";
import { MESSAGE_COLUMNS, unreadCount, type Message } from "@/lib/messages";
import ProfileDetails, {
  ProfileLocation,
  type ProfileDetailFields,
} from "@/components/ProfileDetails";

interface ProfileSummary {
  id: string;
  name: string;
  city: string;
}

/**
 * An incoming request shows the requester's whole public profile, not
 * just a name — the recipient hasn't browsed to them, so this is their
 * only chance to judge the fit before answering. Full name and photo stay
 * out of it: those are governed by the match-reveal rule.
 */
type RequesterProfile = ProfileSummary & ProfileDetailFields;

interface IncomingRow {
  id: string;
  created_at: string;
  status: string;
  requester: RequesterProfile;
}

interface OutgoingRow {
  id: string;
  created_at: string;
  status: string;
  recipient: ProfileSummary;
}

interface MatchedRow {
  id: string;
  created_at: string;
  requester: ProfileSummary;
  recipient: ProfileSummary;
}

interface BlockedRow {
  id: string;
  blocked: ProfileSummary;
}

const PROFILE_SUMMARY_FIELDS = "id, name, city";

const PROFILE_DETAIL_FIELDS =
  "id, name, city, country, region, neighborhood, languages, study_languages, " +
  "topics, topic_other, level, preference, availability, age_range, " +
  "frequency, time_of_day, session_length, blurb, hidden_fields";

export default async function RequestsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Requests");
  const tSafety = await getTranslations("Safety");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: "/login", locale });
  }
  const userId = user!.id;

  const [{ data: incoming }, { data: outgoing }, { data: matched }, { data: blocked }] =
    await Promise.all([
      supabase
        .from("connect_requests")
        .select(
          `id, created_at, status, requester:requester_id(${PROFILE_DETAIL_FIELDS})`,
        )
        .eq("recipient_id", userId)
        .in("status", ["pending", "admin_resolved"])
        .order("created_at", { ascending: false }),
      supabase
        .from("connect_requests")
        .select(`id, created_at, status, recipient:recipient_id(${PROFILE_SUMMARY_FIELDS})`)
        .eq("requester_id", userId)
        .in("status", ["pending", "admin_resolved"])
        .order("created_at", { ascending: false }),
      supabase
        .from("connect_requests")
        .select(
          `id, created_at, requester:requester_id(${PROFILE_SUMMARY_FIELDS}), recipient:recipient_id(${PROFILE_SUMMARY_FIELDS})`,
        )
        .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`)
        .eq("status", "accepted")
        .order("created_at", { ascending: false }),
      supabase
        .from("blocks")
        .select(`id, blocked:blocked_id(${PROFILE_SUMMARY_FIELDS})`)
        .eq("blocker_id", userId)
        .order("created_at", { ascending: false }),
    ]);

  // Filter out rows whose embedded profile came back null. This happens
  // when the other side of a request/match/block is a profile RLS hides
  // from us (most commonly: they blocked us after the row was created) —
  // reading .name off a null embed would otherwise crash the page.
  const incomingRows = ((incoming ?? []) as unknown as IncomingRow[]).filter(
    (row) => row.requester,
  );
  const outgoingRows = ((outgoing ?? []) as unknown as OutgoingRow[]).filter(
    (row) => row.recipient,
  );
  const matchedRows = ((matched ?? []) as unknown as MatchedRow[]).filter(
    (row) => row.requester && row.recipient,
  );
  const blockedRows = ((blocked ?? []) as unknown as BlockedRow[]).filter(
    (row) => row.blocked,
  );

  // Unread counts per match. One query for every thread rather than one
  // per row: a handful of matches shouldn't cost a handful of round trips.
  const matchIds = matchedRows.map((row) => row.id);
  const { data: threadMessages } = matchIds.length
    ? await supabase
        .from("messages")
        .select(MESSAGE_COLUMNS)
        .in("connect_request_id", matchIds)
        .is("read_at", null)
    : { data: [] };

  const unreadByMatch = new Map<string, number>();
  for (const row of matchedRows) {
    const forThread = ((threadMessages ?? []) as unknown as Message[]).filter(
      (m) => m.connect_request_id === row.id,
    );
    unreadByMatch.set(row.id, unreadCount(forThread, userId));
  }

  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-10 px-6 py-12 sm:px-11">
      <h1 className="text-[2rem] font-semibold sm:text-[34px]">{t("title")}</h1>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">{t("incomingTitle")}</h2>
        {incomingRows.length === 0 ? (
          <p className="text-sm text-muted">{t("noIncoming")}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {incomingRows.map((row) => (
              <li
                key={row.id}
                className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-serif text-lg font-medium">
                    {row.requester.name}
                  </p>
                  <ProfileLocation profile={row.requester} />
                </div>

                <ProfileDetails profile={row.requester} />

                {row.status === "admin_resolved" ? (
                  <div className="flex flex-col items-start gap-1">
                    <span className="text-sm text-muted">
                      {t("adminResolved")}
                    </span>
                    <RemoveResolvedRequestButton requestId={row.id} />
                  </div>
                ) : (
                  <RespondButtons requestId={row.id} />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">{t("outgoingTitle")}</h2>
        {outgoingRows.length === 0 ? (
          <p className="text-sm text-muted">{t("noOutgoing")}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {outgoingRows.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4"
              >
                <div>
                  <p className="font-medium">{row.recipient.name}</p>
                  {row.recipient.city && (
                    <p className="text-sm text-muted">{row.recipient.city}</p>
                  )}
                </div>
                {row.status === "admin_resolved" ? (
                  <div className="flex flex-col items-end gap-1">
                    <span className="rounded-sm border border-border px-3.5 py-1.5 text-sm text-muted">
                      {t("adminResolved")}
                    </span>
                    <RemoveResolvedRequestButton requestId={row.id} />
                  </div>
                ) : (
                  <span className="rounded-sm border border-border px-3.5 py-1.5 text-sm text-muted">
                    {t("pending")}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">{t("matchedTitle")}</h2>
        {matchedRows.length === 0 ? (
          <p className="text-sm text-muted">{t("noMatched")}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {matchedRows.map((row) => {
              const other =
                row.requester.id === userId ? row.recipient : row.requester;
              return (
                <li
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4"
                >
                  <div>
                    <p className="font-medium">{other.name}</p>
                    {other.city && (
                      <p className="text-sm text-muted">{other.city}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {/* This was a "Matched" pill, which read as a status
                        badge rather than the way through to the person —
                        so the one place their full name, photo and
                        scheduling live was easy to miss. */}
                    <Link
                      href={`/matches/${row.id}`}
                      className="bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-slate-600"
                    >
                      {t("viewProfile")}
                    </Link>
                    {(unreadByMatch.get(row.id) ?? 0) > 0 && (
                      <span className="bg-brass-tint px-2 py-0.5 text-[12px] text-brass-deep">
                        {t("unreadCount", {
                          count: unreadByMatch.get(row.id) ?? 0,
                        })}
                      </span>
                    )}
                    <UnmatchButton
                      requestId={row.id}
                      partnerName={other.name}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">
          {tSafety("blockedSectionTitle")}
        </h2>
        {blockedRows.length === 0 ? (
          <p className="text-sm text-muted">{tSafety("noBlocked")}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {blockedRows.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4"
              >
                <div>
                  <p className="font-medium">{row.blocked.name}</p>
                  {row.blocked.city && (
                    <p className="text-sm text-muted">{row.blocked.city}</p>
                  )}
                </div>
                <UnblockButton blockId={row.id} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
