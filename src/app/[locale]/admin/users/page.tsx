import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/admin";
import AdminNav from "@/components/AdminNav";
import { LANGUAGE_CODES } from "@/lib/profile-options";

interface AdminUserRow {
  id: string;
  name: string;
  email: string | null;
  city: string;
  languages: string[];
  phone: string | null;
  phone_verified: boolean;
  is_active: boolean;
  suspended: boolean;
  is_admin: boolean;
  created_at: string;
  report_count: number;
}

const controlClass =
  "rounded-xl border border-border bg-transparent px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none";

type SearchParams = {
  search?: string;
  language?: string;
  city?: string;
  verified?: string;
};

export default async function AdminUsersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const filters = await searchParams;

  const t = await getTranslations("Admin");
  const tLanguages = await getTranslations("Languages");
  const { supabase } = await requireAdmin(locale);

  const { data } = await supabase.rpc("admin_list_users", {
    search: filters.search ?? "",
    filter_language: filters.language ?? "",
    filter_city: filters.city ?? "",
    filter_verified: filters.verified ?? "",
  });

  const users = (data ?? []) as AdminUserRow[];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-12">
      <div className="flex flex-col gap-4">
        <h1 className="font-serif text-3xl font-medium">{t("usersTitle")}</h1>
        <AdminNav />
      </div>

      <form className="grid grid-cols-2 gap-3 rounded-2xl border border-border bg-surface p-4 sm:grid-cols-4">
        <label className="col-span-2 flex flex-col gap-1 text-sm">
          {t("searchLabel")}
          <input
            type="text"
            name="search"
            defaultValue={filters.search ?? ""}
            placeholder={t("searchPlaceholder")}
            className={controlClass}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          {t("filterLanguage")}
          <select
            name="language"
            defaultValue={filters.language ?? ""}
            className={controlClass}
          >
            <option value="">{t("filterAll")}</option>
            {LANGUAGE_CODES.map((code) => (
              <option key={code} value={code}>
                {tLanguages(code)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          {t("filterCity")}
          <input
            type="text"
            name="city"
            defaultValue={filters.city ?? ""}
            className={controlClass}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          {t("filterStatus")}
          <select
            name="verified"
            defaultValue={filters.verified ?? ""}
            className={controlClass}
          >
            <option value="">{t("filterAll")}</option>
            <option value="verified">{t("filterVerified")}</option>
            <option value="unverified">{t("filterUnverified")}</option>
            <option value="suspended">{t("filterSuspended")}</option>
          </select>
        </label>

        <button
          type="submit"
          className="col-span-2 w-fit self-end rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
        >
          {t("applyFilters")}
        </button>
      </form>

      <p className="text-sm text-muted">
        {t("userCount", { count: users.length })}
      </p>

      {users.length === 0 ? (
        <p className="text-sm text-muted">{t("noUsers")}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {users.map((user) => (
            <li
              key={user.id}
              className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Link
                  href={`/admin/profiles/${user.id}`}
                  className="font-medium underline"
                >
                  {user.name || t("unnamedUser")}
                </Link>
                <time className="text-xs text-muted" dateTime={user.created_at}>
                  {t("joinedLabel")}{" "}
                  {new Date(user.created_at).toLocaleDateString(locale)}
                </time>
              </div>

              <p className="text-sm text-muted" dir="ltr">
                {user.email ?? "—"}
              </p>

              <div className="flex flex-wrap gap-2 text-xs">
                <span
                  className={`rounded-full border px-2 py-0.5 ${
                    user.phone_verified
                      ? "border-accent/40 text-accent"
                      : "border-border text-muted"
                  }`}
                >
                  {user.phone_verified
                    ? t("badgeVerified")
                    : t("badgeUnverified")}
                </span>
                {user.suspended && (
                  <span className="rounded-full border border-clay/40 px-2 py-0.5 text-clay">
                    {t("badgeSuspended")}
                  </span>
                )}
                {!user.is_active && !user.suspended && (
                  <span className="rounded-full border border-border px-2 py-0.5 text-muted">
                    {t("inactiveBadge")}
                  </span>
                )}
                {user.is_admin && (
                  <span className="rounded-full border border-primary/50 px-2 py-0.5 text-primary">
                    {t("badgeAdmin")}
                  </span>
                )}
                {user.report_count > 0 && (
                  <span className="rounded-full border border-border px-2 py-0.5 text-muted">
                    {t("badgeReports", { count: user.report_count })}
                  </span>
                )}
                {user.city && (
                  <span className="rounded-full border border-border px-2 py-0.5 text-muted">
                    {user.city}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
