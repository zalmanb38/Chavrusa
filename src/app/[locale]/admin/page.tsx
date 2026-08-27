import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/admin";
import AdminNav from "@/components/AdminNav";

interface DashboardStats {
  total_users: number;
  pending_reports: number;
  signups_this_week: number;
  active_matches: number;
  verified_users: number;
  suspended_users: number;
  total_blocks: number;
}

function StatTile({
  value,
  label,
  href,
  attention = false,
}: {
  value: number;
  label: string;
  href?: string;
  attention?: boolean;
}) {
  const base =
    "flex flex-col justify-between gap-3 rounded-2xl border p-4 transition-colors";
  const tone = attention
    ? "border-primary/60 bg-primary/10"
    : "border-border bg-surface";
  const interactive = href ? "hover:border-primary" : "";

  const body = (
    <>
      <p className="text-xs text-muted">{label}</p>
      <p className="font-serif text-4xl leading-none font-medium tabular-nums">
        {value}
      </p>
    </>
  );

  return href ? (
    <Link href={href} className={`${base} ${tone} ${interactive} group`}>
      {body}
    </Link>
  ) : (
    <div className={`${base} ${tone}`}>{body}</div>
  );
}

export default async function AdminDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Admin");
  const { supabase } = await requireAdmin(locale);

  const { data } = await supabase.rpc("admin_dashboard_stats");
  const s = (data ?? null) as DashboardStats | null;

  const pendingReports = s?.pending_reports ?? 0;
  const suspendedUsers = s?.suspended_users ?? 0;

  // Secondary figures: useful context, but not what you open the page for.
  const secondary = [
    { key: "verified", label: t("statVerifiedUsers"), value: s?.verified_users ?? 0 },
    { key: "suspended", label: t("statSuspendedUsers"), value: suspendedUsers },
    { key: "blocks", label: t("statTotalBlocks"), value: s?.total_blocks ?? 0 },
  ];

  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-8 px-6 py-12 sm:px-10">
      <div className="flex flex-col gap-4">
        <h1 className="text-[2rem] font-semibold sm:text-[34px]">
          {t("dashboardTitle")}
        </h1>
        <AdminNav />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          value={s?.total_users ?? 0}
          label={t("statTotalUsers")}
          href="/admin/users"
        />
        <StatTile
          value={pendingReports}
          label={t("statPendingReports")}
          href="/admin/reports"
          attention={pendingReports > 0}
        />
        <StatTile
          value={s?.signups_this_week ?? 0}
          label={t("statSignupsThisWeek")}
        />
        <StatTile
          value={s?.active_matches ?? 0}
          label={t("statActiveMatches")}
        />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted">
          {t("communityHealthTitle")}
        </h2>
        <dl className="grid grid-cols-3 divide-x divide-border rounded-2xl border border-border bg-surface">
          {secondary.map((item) => (
            <div key={item.key} className="flex flex-col gap-1 px-4 py-3">
              <dt className="text-xs text-muted">{item.label}</dt>
              <dd className="font-serif text-xl font-medium tabular-nums">
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
        <p className="text-xs text-muted">
          {pendingReports > 0
            ? t("dashboardActionHint", { count: pendingReports })
            : t("dashboardAllClear")}
        </p>
      </section>
    </div>
  );
}
