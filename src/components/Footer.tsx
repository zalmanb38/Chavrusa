import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function Footer() {
  const t = await getTranslations("Footer");
  const common = await getTranslations("Common");

  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-4xl flex-col gap-3 px-4 py-8 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted">
          © {new Date().getFullYear()} {common("appName")}
        </p>

        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <Link href="/privacy" className="text-muted hover:text-foreground">
            {t("privacy")}
          </Link>
          <Link href="/terms" className="text-muted hover:text-foreground">
            {t("terms")}
          </Link>
          <Link href="/contact" className="text-muted hover:text-foreground">
            {t("contact")}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
