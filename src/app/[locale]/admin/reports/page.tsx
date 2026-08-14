import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";

interface ProfileSummary {
  id: string;
  name: string;
}

interface ReportRow {
  id: string;
  reason: string;
  created_at: string;
  reporter: ProfileSummary | null;
  reported: ProfileSummary | null;
}

export default async function AdminReportsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Admin");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: "/login", locale });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user!.id)
    .maybeSingle();

  if (!profile?.is_admin) {
    notFound();
  }

  const { data: reports } = await supabase
    .from("reports")
    .select(
      "id, reason, created_at, reporter:reporter_id(id, name), reported:reported_id(id, name)",
    )
    .order("created_at", { ascending: false });

  const reportRows = (reports ?? []) as unknown as ReportRow[];

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-12">
      <h1 className="font-serif text-3xl font-medium">{t("reportsTitle")}</h1>

      {reportRows.length === 0 ? (
        <p className="text-sm text-muted">{t("noReports")}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {reportRows.map((row) => (
            <li
              key={row.id}
              className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <p>
                  <span className="font-medium">
                    {row.reporter?.name || t("unknownUser")}
                  </span>{" "}
                  <span className="text-muted">{t("reportedArrow")}</span>{" "}
                  <span className="font-medium">
                    {row.reported?.name || t("unknownUser")}
                  </span>
                </p>
                <time className="text-xs text-muted" dateTime={row.created_at}>
                  {new Date(row.created_at).toLocaleString(locale)}
                </time>
              </div>
              <p className="text-sm">{row.reason}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
