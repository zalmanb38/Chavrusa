import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

const linkClass =
  "rounded-full border border-border px-3.5 py-1.5 text-sm text-foreground/80 hover:bg-foreground/5 hover:text-foreground";

export default async function AdminNav() {
  const t = await getTranslations("Admin");

  return (
    <nav className="flex flex-wrap gap-2">
      <Link href="/admin" className={linkClass}>
        {t("dashboardTitle")}
      </Link>
      <Link href="/admin/reports" className={linkClass}>
        {t("reportsTitle")}
      </Link>
      <Link href="/admin/users" className={linkClass}>
        {t("usersTitle")}
      </Link>
      <Link href="/admin/blocks" className={linkClass}>
        {t("blocksTitle")}
      </Link>
    </nav>
  );
}
