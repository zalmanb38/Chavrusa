import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/admin";
import AdminNav from "@/components/AdminNav";
import AdminDeactivateButton from "@/components/AdminDeactivateButton";
import AdminDismissReportButton from "@/components/AdminDismissReportButton";

interface ProfileSummary {
  id: string;
  name: string;
}

interface ReportedProfile extends ProfileSummary {
  is_active: boolean;
}

interface ReportRow {
  id: string;
  reason: string;
  created_at: string;
  connect_request_id: string | null;
  reporter: ProfileSummary | null;
  reported: ReportedProfile | null;
}

export default async function AdminReportsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Admin");

  const { supabase } = await requireAdmin(locale);

  const { data: reports } = await supabase
    .from("reports")
    .select(
      "id, reason, created_at, connect_request_id, reporter:reporter_id(id, name), reported:reported_id(id, name, is_active)",
    )
    .order("created_at", { ascending: false });

  const reportRows = (reports ?? []) as unknown as ReportRow[];

  // Only the threads that reports actually name. The RLS policy grants
  // exactly this and no more, so a query for anything else comes back
  // empty rather than being quietly allowed.
  const reportedThreadIds = [
    ...new Set(
      reportRows
      .map((r) => r.connect_request_id)
      .filter((id): id is string => Boolean(id)),
    ),
  ];

  const { data: threadMessages } = reportedThreadIds.length
    ? await supabase
        .from("messages")
        .select("id, connect_request_id, sender_id, body, created_at")
        .in("connect_request_id", reportedThreadIds)
        .order("created_at", { ascending: true })
    : { data: [] };

  const threadsByRequest = new Map<
    string,
    { id: string; sender_id: string; body: string; created_at: string }[]
  >();
  for (const message of (threadMessages ?? []) as {
    id: string;
    connect_request_id: string;
    sender_id: string;
    body: string;
    created_at: string;
  }[]) {
    const list = threadsByRequest.get(message.connect_request_id) ?? [];
    list.push(message);
    threadsByRequest.set(message.connect_request_id, list);
  }

  const nameById = new Map<string, string>();
  for (const row of reportRows) {
    if (row.reporter) nameById.set(row.reporter.id, row.reporter.name);
    if (row.reported) nameById.set(row.reported.id, row.reported.name);
  }

  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-6 px-6 py-12 sm:px-10">
      <div className="flex flex-col gap-4">
        <h1 className="text-[2rem] font-semibold sm:text-[34px]">{t("reportsTitle")}</h1>
        <AdminNav />
      </div>

      {reportRows.length === 0 ? (
        <p className="text-sm text-muted">{t("noReports")}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {reportRows.map((row) => (
            <li
              key={row.id}
              className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <p>
                  <span className="font-medium">
                    {row.reporter ? (
                      <Link
                        href={`/admin/profiles/${row.reporter.id}`}
                        className="underline"
                      >
                        {row.reporter.name || t("unknownUser")}
                      </Link>
                    ) : (
                      t("unknownUser")
                    )}
                  </span>{" "}
                  <span className="text-muted">{t("reportedArrow")}</span>{" "}
                  <span className="font-medium">
                    {row.reported ? (
                      <Link
                        href={`/admin/profiles/${row.reported.id}`}
                        className="underline"
                      >
                        {row.reported.name || t("unknownUser")}
                      </Link>
                    ) : (
                      t("unknownUser")
                    )}
                  </span>
                  {row.reported && !row.reported.is_active && (
                    <span className="ms-2 rounded-sm border border-border px-2 py-0.5 text-xs text-muted">
                      {t("inactiveBadge")}
                    </span>
                  )}
                </p>
                <time className="text-xs text-muted" dateTime={row.created_at}>
                  {new Date(row.created_at).toLocaleString(locale)}
                </time>
              </div>
              <p className="text-sm">{row.reason}</p>

              {row.connect_request_id && (
                <details className="border-t border-border pt-3">
                  <summary className="cursor-pointer text-sm font-medium select-none">
                    {t("reportedConversation")}
                  </summary>
                  <ol className="mt-3 flex flex-col gap-2">
                    {(threadsByRequest.get(row.connect_request_id) ?? []).map(
                      (message) => (
                        <li key={message.id} className="text-sm">
                          <span className="text-[11px] tracking-[0.14em] text-muted uppercase">
                            {nameById.get(message.sender_id) ?? t("unknownUser")}
                            {" · "}
                            {new Date(message.created_at).toLocaleString(locale)}
                          </span>
                          <p className="whitespace-pre-wrap">{message.body}</p>
                        </li>
                      ),
                    )}
                    {(threadsByRequest.get(row.connect_request_id) ?? [])
                      .length === 0 && (
                      <li className="text-sm text-muted">
                        {t("conversationEmpty")}
                      </li>
                    )}
                  </ol>
                </details>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-1">
                {row.reported && (
                  <AdminDeactivateButton
                    profileId={row.reported.id}
                    isActive={row.reported.is_active}
                  />
                )}
                <AdminDismissReportButton
                  reportId={row.id}
                  reporterId={row.reporter?.id}
                  reportedId={row.reported?.id}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
