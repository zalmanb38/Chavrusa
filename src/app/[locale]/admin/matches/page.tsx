import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/lib/admin";
import AdminNav from "@/components/AdminNav";
import UnmatchButton from "@/components/UnmatchButton";
import { Link } from "@/i18n/navigation";

interface MatchRow {
  id: string;
  created_at: string;
  updated_at: string;
  requester_id: string;
  recipient_id: string;
}

interface EndingRow {
  id: string;
  participant_a: string;
  participant_b: string;
  ended_at: string;
  ended_by: string | null;
  ended_by_admin: boolean;
}

export default async function AdminMatchesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Admin");
  const { supabase } = await requireAdmin(locale);

  const [
    { data: matches, error: matchesError },
    { data: endings, error: endingsError },
  ] = await Promise.all([
    supabase
      .from("connect_requests")
      .select("id, created_at, updated_at, requester_id, recipient_id")
      .eq("status", "accepted")
      .order("updated_at", { ascending: false }),
    supabase
      .from("match_endings")
      .select("id, participant_a, participant_b, ended_at, ended_by, ended_by_admin")
      .order("ended_at", { ascending: false })
      .limit(50),
  ]);

  if (matchesError) console.error("Admin matches query failed", matchesError);
  if (endingsError) console.error("Match endings query failed", endingsError);

  const matchRows = (matches ?? []) as MatchRow[];
  const endingRows = (endings ?? []) as EndingRow[];

  // Names are fetched separately: connect_requests has two foreign keys to
  // profiles, so a bare embed can't be resolved (PGRST201).
  const ids = [
    ...new Set([
      ...matchRows.flatMap((m) => [m.requester_id, m.recipient_id]),
      ...endingRows.flatMap((e) => [e.participant_a, e.participant_b]),
    ]),
  ];

  const { data: people } = ids.length
    ? await supabase.from("profiles").select("id, name").in("id", ids)
    : { data: [] };

  const nameById = new Map(
    ((people ?? []) as { id: string; name: string }[]).map((p) => [p.id, p.name]),
  );
  const nameOf = (id: string) => nameById.get(id) || t("unknownUser");

  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-6 px-6 py-12 sm:px-10">
      <h1 className="text-[2rem] font-semibold sm:text-[34px]">{t("matchesTitle")}</h1>
      <AdminNav />

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">
          {t("activeMatches")} ({matchRows.length})
        </h2>
        <p className="text-sm text-muted">{t("matchesIntro")}</p>

        {matchesError ? (
          <p className="rounded-2xl border border-border bg-surface p-5 text-sm">
            {t("matchesQueryFailed")}
          </p>
        ) : matchRows.length === 0 ? (
          <p className="text-sm text-muted">{t("noActiveMatches")}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {matchRows.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4"
              >
                <div className="flex flex-col gap-1 text-sm">
                  <p className="font-medium">
                    <Link
                      href={`/admin/profiles/${row.requester_id}`}
                      className="underline"
                    >
                      {nameOf(row.requester_id)}
                    </Link>
                    {" · "}
                    <Link
                      href={`/admin/profiles/${row.recipient_id}`}
                      className="underline"
                    >
                      {nameOf(row.recipient_id)}
                    </Link>
                  </p>
                  <p className="text-xs text-muted">
                    {t("matchedSince")}:{" "}
                    {new Date(row.updated_at).toLocaleString(locale)}
                  </p>
                </div>
                <UnmatchButton requestId={row.id} variant="admin" />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">{t("recentUnmatches")}</h2>
        <p className="text-sm text-muted">{t("unmatchLogIntro")}</p>

        {endingRows.length === 0 ? (
          <p className="text-sm text-muted">{t("noUnmatches")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {endingRows.map((row) => (
              <li
                key={row.id}
                className="rounded-xl border border-border bg-surface p-3 text-sm"
              >
                <p>
                  {nameOf(row.participant_a)} · {nameOf(row.participant_b)}
                </p>
                <p className="text-xs text-muted">
                  {new Date(row.ended_at).toLocaleString(locale)} —{" "}
                  {row.ended_by_admin
                    ? t("endedByAdmin")
                    : t("endedByParticipant", {
                        name: row.ended_by ? nameOf(row.ended_by) : "",
                      })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
