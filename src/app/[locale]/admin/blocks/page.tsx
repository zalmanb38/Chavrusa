import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/admin";
import AdminNav from "@/components/AdminNav";
import AdminPager, {
  ADMIN_PAGE_SIZE,
  pageFrom,
} from "@/components/AdminPager";

interface ProfileSummary {
  id: string;
  name: string;
}

interface BlockRow {
  id: string;
  created_at: string;
  blocker: ProfileSummary | null;
  blocked: ProfileSummary | null;
}

export default async function AdminBlocksPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const filters = await searchParams;

  const t = await getTranslations("Admin");
  const { supabase } = await requireAdmin(locale);

  const page = pageFrom(filters.page);
  const from = (page - 1) * ADMIN_PAGE_SIZE;

  // count: "exact" asks for the size of the whole set alongside the slice,
  // which is what the pager needs and what range() alone cannot say.
  const { data, count } = await supabase
    .from("blocks")
    .select(
      "id, created_at, blocker:blocker_id(id, name), blocked:blocked_id(id, name)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, from + ADMIN_PAGE_SIZE - 1);

  const blocks = (data ?? []) as unknown as BlockRow[];
  const total = count ?? 0;

  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-6 px-6 py-12 sm:px-10">
      <div className="flex flex-col gap-4">
        <h1 className="text-[2rem] font-semibold sm:text-[34px]">{t("blocksTitle")}</h1>
        <AdminNav />
      </div>

      {blocks.length === 0 ? (
        <p className="text-sm text-muted">{t("noBlocksRecorded")}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {blocks.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-baseline justify-between gap-2 rounded-2xl border border-border bg-surface p-4 text-sm"
            >
              <p>
                {row.blocker ? (
                  <Link
                    href={`/admin/profiles/${row.blocker.id}`}
                    className="font-medium underline"
                  >
                    {row.blocker.name || t("unknownUser")}
                  </Link>
                ) : (
                  <span className="font-medium">{t("unknownUser")}</span>
                )}{" "}
                <span className="text-muted">{t("blockedArrow")}</span>{" "}
                {row.blocked ? (
                  <Link
                    href={`/admin/profiles/${row.blocked.id}`}
                    className="font-medium underline"
                  >
                    {row.blocked.name || t("unknownUser")}
                  </Link>
                ) : (
                  <span className="font-medium">{t("unknownUser")}</span>
                )}
              </p>
              <time className="text-xs text-muted" dateTime={row.created_at}>
                {new Date(row.created_at).toLocaleString(locale)}
              </time>
            </li>
          ))}
        </ul>
      )}

      <AdminPager pathname="/admin/blocks" page={page} total={total} query={{}} />
    </div>
  );
}
