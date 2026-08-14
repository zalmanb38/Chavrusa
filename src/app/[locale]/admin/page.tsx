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
  const stats = (data ?? null) as DashboardStats | null;

  const tiles: { key: string; label: string; value: number; href?: string }[] = [
    {
      key: "users",
      label: t("statTotalUsers"),
      value: stats?.total_users ?? 0,
      href: "/admin/users",
    },
    {
      key: "reports",
      label: t("statPendingReports"),
      value: stats?.pending_reports ?? 0,
      href: "/admin/reports",
    },
    {
      key: "signups",
      label: t("statSignupsThisWeek"),
      value: stats?.signups_this_week ?? 0,
    },
    {
      key: "matches",
      label: t("statActiveMatches"),
      value: stats?.active_matches ?? 0,
    },
    {
      key: "verified",
      label: t("statVerifiedUsers"),
      value: stats?.verified_users ?? 0,
    },
    {
      key: "suspended",
      label: t("statSuspendedUsers"),
      value: stats?.suspended_users ?? 0,
    },
    {
      key: "blocks",
      label: t("statTotalBlocks"),
      value: stats?.total_blocks ?? 0,
      href: "/admin/blocks",
    },
  ];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-12">
      <h1 className="font-serif text-3xl font-medium">{t("dashboardTitle")}</h1>
      <AdminNav />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {tiles.map((tile) => {
          const body = (
            <>
              <p className="font-serif text-3xl font-medium">{tile.value}</p>
              <p className="text-xs text-muted">{tile.label}</p>
            </>
          );

          return tile.href ? (
            <Link
              key={tile.key}
              href={tile.href}
              className="flex flex-col gap-1 rounded-2xl border border-border bg-surface p-5 shadow-sm hover:border-primary"
            >
              {body}
            </Link>
          ) : (
            <div
              key={tile.key}
              className="flex flex-col gap-1 rounded-2xl border border-border bg-surface p-5 shadow-sm"
            >
              {body}
            </div>
          );
        })}
      </div>
    </div>
  );
}
