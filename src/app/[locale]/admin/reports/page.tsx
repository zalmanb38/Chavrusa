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
      "id, reason, created_at, reporter:reporter_id(id, name), reported:reported_id(id, name, is_active)",
    )
    .order("created_at", { ascending: false });

  const reportRows = (reports ?? []) as unknown as ReportRow[];

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
