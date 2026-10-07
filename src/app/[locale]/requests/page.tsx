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
import RequestSectionIcon from "@/components/RequestSectionIcon";
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
 * of class names, and the difference showed: this is one section head,
 * one empty state and one person row, used four times.
 *
 * The treatment follows Browse — hairline rules and whitespace — with
 * one departure: this page is mostly empty for most people most of the
 * time, so the empty state is its usual appearance rather than an edge
 * case, and it carries the brass the rest of the site uses for emphasis.
 */
function SectionHead({
  kind,
  title,
  count,
  tone = "neutral",
}: {
  kind: "incoming" | "outgoing" | "matched" | "blocked";
  title: string;
  count: number;
  /** Matches are what the page is for, so they lead in brass. */
  tone?: "neutral" | "warm";
}) {
  const warm = tone === "warm";
  return (
    <div
      className={`flex items-center gap-3 border-t-2 pt-5 ${
        warm ? "border-brass" : "border-border"
      }`}
    >
      <RequestSectionIcon
        kind={kind}
        className={`size-[22px] shrink-0 ${warm ? "text-brass" : "text-muted"}`}
      />
      <h2 className="text-[21px] font-semibold">{title}</h2>
      {/* Shown at zero too: a section that states its count reads as a
          part of the product, where one that goes quiet reads unfinished. */}
      <span
        className={`text-[15px] ${warm && count > 0 ? "text-brass-deep" : "text-muted"}`}
      >
        · {count}
      </span>
    </div>
  );
}

/**
 * An empty section, said deliberately.
 *
 * A solid parchment panel rather than a dashed outline — dashes read as
 * scaffolding someone forgot to replace. The message sits beside its own
 * icon at the start of the line instead of floating in the middle of a
 * wide rectangle, and where there is something useful to do next, it
 * carries the way there rather than ending the sentence.
 */
function EmptyState({
  kind,
  children,
  action,
}: {
  kind: "incoming" | "outgoing" | "matched" | "blocked";
  children: React.ReactNode;
  action?: { href: string; label: string };
}) {
  return (
    // items-start, and the words in their own column: on a narrow screen
    // a wrapping line used to push the icon onto a row of its own.
    <div className="flex max-w-[46em] items-start gap-3.5 border-s-2 border-brass bg-surface px-5 py-4">
      <RequestSectionIcon
        kind={kind}
        className="mt-0.5 size-5 shrink-0 text-brass"
      />
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="text-sm text-muted">{children}</p>
        {action && (
          <Link
            href={action.href}
            className="text-sm font-medium text-accent underline underline-offset-4 hover:text-brass-deep"
          >
            {action.label}
          </Link>
        )}
      </div>
    </div>
  );
}

/**
 * One person in a list.
 *
 * The initial stands in for a photograph, which this page never has: a
 * profile photo is only revealed on a confirmed match, and even then it
 * belongs on the match page rather than in a list.
 */
function PersonRow({
  name,
  city,
  warm = false,
  children,
}: {
  name: string;
  city?: string;
  warm?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 border-t border-border py-4 transition-colors hover:bg-surface">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className={`flex size-10 shrink-0 items-center justify-center rounded-full text-[17px] font-semibold ${
            warm
              ? "bg-brass-tint text-brass-deep"
              : "bg-surface text-muted"
          }`}
        >
          {name.trim().charAt(0).toUpperCase()}
        </span>
        <div className="flex flex-col gap-0.5">
          <p className="text-[17px] font-medium">{name}</p>
          {city && <p className="text-[13.5px] text-muted">{city}</p>}
        </div>
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
  // The way out of an empty section is Browse, and it already has an
  // approved label there — reused rather than written again here.
  const tHome = await getTranslations("Home");

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
        <SectionHead
          kind="incoming"
          title={t("incomingTitle")}
          count={incomingRows.length}
        />
        {incomingRows.length === 0 ? (
          <EmptyState
            kind="incoming"
            action={{ href: "/browse", label: tHome("browseChavrusas") }}
          >
            {t("noIncoming")}
          </EmptyState>
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
        <SectionHead
          kind="outgoing"
          title={t("outgoingTitle")}
          count={outgoingRows.length}
        />
        {outgoingRows.length === 0 ? (
          <EmptyState
            kind="outgoing"
            action={{ href: "/browse", label: tHome("browseChavrusas") }}
          >
            {t("noOutgoing")}
          </EmptyState>
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
        <SectionHead
          kind="matched"
          tone="warm"
          title={t("matchedTitle")}
          count={matchedRows.length}
        />
        {matchedRows.length === 0 ? (
          <EmptyState
            kind="matched"
            action={{ href: "/browse", label: tHome("browseChavrusas") }}
          >
            {t("noMatched")}
          </EmptyState>
        ) : (
          <ul className="flex flex-col">
            {matchedRows.map((row) => {
              const other =
                row.requester.id === userId ? row.recipient : row.requester;
              return (
                <PersonRow key={row.id} name={other.name} city={other.city} warm>
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
          kind="blocked"
          title={tSafety("blockedSectionTitle")}
          count={blockedRows.length}
        />
        {blockedRows.length === 0 ? (
          <EmptyState kind="blocked">{tSafety("noBlocked")}</EmptyState>
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
