"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

const TABS = [
  { href: "/admin", key: "dashboardTitle" },
  { href: "/admin/reports", key: "reportsTitle" },
  { href: "/admin/users", key: "usersTitle" },
  { href: "/admin/blocks", key: "blocksTitle" },
] as const;

export default function AdminNav() {
  const t = useTranslations("Admin");
  const pathname = usePathname();

  return (
    <nav className="-mx-1 flex gap-1 overflow-x-auto border-b border-border pb-px">
      {TABS.map((tab) => {
        // Profile detail pages hang off the user list, so keep Users lit
        // while drilled into one.
        const active =
          tab.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(tab.href) ||
              (tab.href === "/admin/users" &&
                pathname.startsWith("/admin/profiles"));

        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`shrink-0 rounded-t-lg border-b-2 px-3.5 py-2 text-sm transition-colors ${
              active
                ? "border-primary font-medium text-foreground"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {t(tab.key)}
          </Link>
        );
      })}
    </nav>
  );
}
