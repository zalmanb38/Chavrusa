import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import RespondButtons from "@/components/RespondButtons";
import UnblockButton from "@/components/UnblockButton";
import RemoveResolvedRequestButton from "@/components/RemoveResolvedRequestButton";
import UnmatchButton from "@/components/UnmatchButton";
import ImageSlot from "@/components/ImageSlot";
import { MESSAGE_COLUMNS, unreadCount, type Message } from "@/lib/messages";
import { PROFILE_DETAIL_FIELDS } from "@/lib/browse-filters";
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

/**
 * The page's shared furniture.
 *
 * Four sections that each list people were four slightly different sets
 * of class names, and the difference showed: this is one section head and
 * one empty state, used four times.
 *
 * The treatment follows Browse rather than the rounded cards this page
 * used to carry — hairline rules and whitespace, which is the language
 * the rest of the site is built in.
 */
function SectionHead({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-3 border-t border-border pt-5">
      <h2 className="text-[21px] font-semibold">{title}</h2>
      {count > 0 && (
        <span className="text-[11.5px] tracking-[0.14em] text-muted uppercase">
          {count}
        </span>
      )}
    </div>
  );
}

/**
 * An empty section, said deliberately rather than left as a loose grey
 * line. Most of this page is empty for most people most of the time, so
 * the empty state is the page's usual appearance, not an edge case.
 */
function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="border border-dashed border-border px-5 py-7 text-center text-sm text-muted">
      {children}
    </p>
  );
}

/** One person in a list: name, where they are, and what you can do. */
function PersonRow({
  name,
  city,
  children,
}: {
  name: string;
  city?: string;
  children?: React.ReactNode;
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 border-t border-border py-4 transition-colors hover:bg-surface">
      <div className="flex flex-col gap-0.5">
        <p className="text-[17px] font-medium">{name}</p>
        {city && <p className="text-[13.5px] text-muted">{city}</p>}
      </div>
      {children && (
        <div className="flex flex-wrap items-center gap-3">{children}</div>
      )}
    </li>
  );
}


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
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-9 px-6 py-12 sm:px-11">
      <ImageSlot
        direction="Two chavrusas' seforim, side by side"
        src="/photos/p4-two-seforim.jpg"
        alt=""
        height={180}
      />

      <h1 className="text-[2rem] font-semibold sm:text-[34px]">{t("title")}</h1>

      <section className="flex flex-col gap-4">
        <SectionHead title={t("incomingTitle")} count={incomingRows.length} />
        {incomingRows.length === 0 ? (
          <EmptyState>{t("noIncoming")}</EmptyState>
        ) : (
          <ul className="flex flex-col">
            {incomingRows.map((row) => (
              <li
                key={row.id}
                className="flex flex-col gap-3 border-t border-border py-5"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-[21px] leading-tight font-semibold">
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

      <section className="flex flex-col gap-4">
        <SectionHead title={t("outgoingTitle")} count={outgoingRows.length} />
        {outgoingRows.length === 0 ? (
          <EmptyState>{t("noOutgoing")}</EmptyState>
        ) : (
          <ul className="flex flex-col">
            {outgoingRows.map((row) => (
              <PersonRow
                key={row.id}
                name={row.recipient.name}
                city={row.recipient.city}
              >
                {row.status === "admin_resolved" ? (
                  <div className="flex flex-col items-end gap-1">
                    <span className="border border-border px-3.5 py-1.5 text-sm text-muted">
                      {t("adminResolved")}
                    </span>
                    <RemoveResolvedRequestButton requestId={row.id} />
                  </div>
                ) : (
                  <span className="border border-border px-3.5 py-1.5 text-sm text-muted">
                    {t("pending")}
                  </span>
                )}
              </PersonRow>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <SectionHead title={t("matchedTitle")} count={matchedRows.length} />
        {matchedRows.length === 0 ? (
          <EmptyState>{t("noMatched")}</EmptyState>
        ) : (
          <ul className="flex flex-col">
            {matchedRows.map((row) => {
              const other =
                row.requester.id === userId ? row.recipient : row.requester;
              return (
                <PersonRow key={row.id} name={other.name} city={other.city}>
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
                </PersonRow>
              );
            })}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <SectionHead
          title={tSafety("blockedSectionTitle")}
          count={blockedRows.length}
        />
        {blockedRows.length === 0 ? (
          <EmptyState>{tSafety("noBlocked")}</EmptyState>
        ) : (
          <ul className="flex flex-col">
            {blockedRows.map((row) => (
              <PersonRow
                key={row.id}
                name={row.blocked.name}
                city={row.blocked.city}
              >
                <UnblockButton blockId={row.id} />
              </PersonRow>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
