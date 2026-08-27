import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function Footer() {
  const t = await getTranslations("Footer");
  const common = await getTranslations("Common");

  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-3 px-6 py-10 text-[13.5px] text-muted sm:flex-row sm:items-center sm:justify-between sm:px-14">
        {/* 3E: the line carries who the site is for, on every page. */}
        <p>
          © {new Date().getFullYear()} {common("appName")} · {t("tagline")}
        </p>

        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <Link href="/about" className="hover:text-foreground">
            {t("about")}
          </Link>
          <Link href="/browse" className="hover:text-foreground">
            {t("browse")}
          </Link>
          <Link href="/privacy" className="hover:text-foreground">
            {t("privacy")}
          </Link>
          <Link href="/terms" className="hover:text-foreground">
            {t("terms")}
          </Link>
          <Link href="/contact" className="hover:text-foreground">
            {t("contact")}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
