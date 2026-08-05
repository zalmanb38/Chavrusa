import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import RespondButtons from "@/components/RespondButtons";

interface ProfileSummary {
  id: string;
  name: string;
  city: string;
}

interface IncomingRow {
  id: string;
  created_at: string;
  requester: ProfileSummary;
}

interface OutgoingRow {
  id: string;
  created_at: string;
  recipient: ProfileSummary;
}

interface MatchedRow {
  id: string;
  created_at: string;
  requester: ProfileSummary;
  recipient: ProfileSummary;
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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: "/login", locale });
  }
  const userId = user!.id;

  const [{ data: incoming }, { data: outgoing }, { data: matched }] =
    await Promise.all([
      supabase
        .from("connect_requests")
        .select(`id, created_at, requester:requester_id(${PROFILE_SUMMARY_FIELDS})`)
        .eq("recipient_id", userId)
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
      supabase
        .from("connect_requests")
        .select(`id, created_at, recipient:recipient_id(${PROFILE_SUMMARY_FIELDS})`)
        .eq("requester_id", userId)
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
      supabase
        .from("connect_requests")
        .select(
          `id, created_at, requester:requester_id(${PROFILE_SUMMARY_FIELDS}), recipient:recipient_id(${PROFILE_SUMMARY_FIELDS})`,
        )
        .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`)
        .eq("status", "accepted")
        .order("created_at", { ascending: false }),
    ]);

  const incomingRows = (incoming ?? []) as unknown as IncomingRow[];
  const outgoingRows = (outgoing ?? []) as unknown as OutgoingRow[];
  const matchedRows = (matched ?? []) as unknown as MatchedRow[];

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-10 px-4 py-12">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">{t("incomingTitle")}</h2>
        {incomingRows.length === 0 ? (
          <p className="text-sm text-black/60 dark:text-white/60">
            {t("noIncoming")}
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {incomingRows.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-black/10 p-4 dark:border-white/10"
              >
                <div>
                  <p className="font-medium">{row.requester.name}</p>
                  {row.requester.city && (
                    <p className="text-sm text-black/60 dark:text-white/60">
                      {row.requester.city}
                    </p>
                  )}
                </div>
                <RespondButtons requestId={row.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">{t("outgoingTitle")}</h2>
        {outgoingRows.length === 0 ? (
          <p className="text-sm text-black/60 dark:text-white/60">
            {t("noOutgoing")}
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {outgoingRows.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-black/10 p-4 dark:border-white/10"
              >
                <div>
                  <p className="font-medium">{row.recipient.name}</p>
                  {row.recipient.city && (
                    <p className="text-sm text-black/60 dark:text-white/60">
                      {row.recipient.city}
                    </p>
                  )}
                </div>
                <span className="text-sm text-black/50 dark:text-white/50">
                  {t("pending")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">{t("matchedTitle")}</h2>
        {matchedRows.length === 0 ? (
          <p className="text-sm text-black/60 dark:text-white/60">
            {t("noMatched")}
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {matchedRows.map((row) => {
              const other =
                row.requester.id === userId ? row.recipient : row.requester;
              return (
                <li
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-black/10 p-4 dark:border-white/10"
                >
                  <div>
                    <p className="font-medium">{other.name}</p>
                    {other.city && (
                      <p className="text-sm text-black/60 dark:text-white/60">
                        {other.city}
                      </p>
                    )}
                  </div>
                  <Link
                    href={`/matches/${row.id}`}
                    className="rounded-md bg-green-100 px-3 py-1.5 text-sm text-green-800 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-300 dark:hover:bg-green-900/70"
                  >
                    {t("matched")}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
