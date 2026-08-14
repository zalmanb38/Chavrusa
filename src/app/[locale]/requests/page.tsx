import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import RespondButtons from "@/components/RespondButtons";
import UnblockButton from "@/components/UnblockButton";
import RemoveResolvedRequestButton from "@/components/RemoveResolvedRequestButton";

interface ProfileSummary {
  id: string;
  name: string;
  city: string;
}

interface IncomingRow {
  id: string;
  created_at: string;
  status: string;
  requester: ProfileSummary;
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
        .select(`id, created_at, status, requester:requester_id(${PROFILE_SUMMARY_FIELDS})`)
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

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-10 px-4 py-12">
      <h1 className="font-serif text-3xl font-medium">{t("title")}</h1>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">{t("incomingTitle")}</h2>
        {incomingRows.length === 0 ? (
          <p className="text-sm text-muted">{t("noIncoming")}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {incomingRows.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm"
              >
                <div>
                  <p className="font-medium">{row.requester.name}</p>
                  {row.requester.city && (
                    <p className="text-sm text-muted">{row.requester.city}</p>
                  )}
                </div>
                {row.status === "admin_resolved" ? (
                  <div className="flex flex-col items-end gap-1">
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
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm"
              >
                <div>
                  <p className="font-medium">{row.recipient.name}</p>
                  {row.recipient.city && (
                    <p className="text-sm text-muted">{row.recipient.city}</p>
                  )}
                </div>
                {row.status === "admin_resolved" ? (
                  <div className="flex flex-col items-end gap-1">
                    <span className="rounded-full border border-border px-3.5 py-1.5 text-sm text-muted">
                      {t("adminResolved")}
                    </span>
                    <RemoveResolvedRequestButton requestId={row.id} />
                  </div>
                ) : (
                  <span className="rounded-full border border-border px-3.5 py-1.5 text-sm text-muted">
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
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm"
                >
                  <div>
                    <p className="font-medium">{other.name}</p>
                    {other.city && (
                      <p className="text-sm text-muted">{other.city}</p>
                    )}
                  </div>
                  <Link
                    href={`/matches/${row.id}`}
                    className="rounded-full bg-accent/15 px-3.5 py-1.5 text-sm font-medium text-accent hover:bg-accent/25"
                  >
                    {t("matched")}
                  </Link>
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
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm"
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
