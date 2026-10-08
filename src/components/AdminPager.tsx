import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

export const ADMIN_PAGE_SIZE = 50;

/** The page number from a query string, 1-based and never out of range. */
export function pageFrom(raw: string | undefined): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

/**
 * Previous/next for the admin lists.
 *
 * Numbered pages were the alternative and are worse here: the lists are
 * ordered newest-first and read from the top, so "page 7" is not a place
 * anyone navigates to on purpose. Two links and a position is the whole
 * requirement.
 *
 * Renders nothing when everything fits on one page, so the lists look
 * exactly as they do today until there is enough to page through.
 */
export default async function AdminPager({
  pathname,
  page,
  total,
  query,
}: {
  /** Locale-less path, e.g. "/admin/users"; the Link adds the prefix. */
  pathname: string;
  page: number;
  total: number;
  /** The current filters, so paging keeps them rather than resetting. */
  query: Record<string, string>;
}) {
  const t = await getTranslations("Admin");
  const pages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));

  if (pages <= 1) return null;

  const hrefFor = (target: number) => {
    const params = new URLSearchParams(
      Object.entries(query).filter(([, v]) => v !== ""),
    );
    params.set("page", String(target));
    return `${pathname}?${params.toString()}`;
  };

  const linkClass =
    "border border-border px-3.5 py-1.5 text-sm hover:bg-surface";
  const mutedClass =
    "border border-border px-3.5 py-1.5 text-sm text-muted/50";

  return (
    <nav className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
      <span className="text-sm text-muted">
        {t("pageOf", { page, pages, total })}
      </span>

      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link href={hrefFor(page - 1)} className={linkClass}>
            {t("previousPage")}
          </Link>
        ) : (
          <span className={mutedClass}>{t("previousPage")}</span>
        )}

        {page < pages ? (
          <Link href={hrefFor(page + 1)} className={linkClass}>
            {t("nextPage")}
          </Link>
        ) : (
          <span className={mutedClass}>{t("nextPage")}</span>
        )}
      </div>
    </nav>
  );
}
