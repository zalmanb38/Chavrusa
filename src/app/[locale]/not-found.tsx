import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

// Reached both by an unmatched URL and by an explicit notFound() — the
// admin routes use it deliberately, so that a signed-in non-admin can't
// tell a forbidden page from one that doesn't exist.
export default async function NotFound() {
  const t = await getTranslations("ErrorPages");

  return (
    <div className="mx-auto flex max-w-md flex-col items-start gap-4 px-4 py-24">
      <p className="font-serif text-5xl font-medium text-primary">404</p>
      <h1 className="font-serif text-3xl font-medium">{t("notFoundTitle")}</h1>
      <p className="text-muted">{t("notFoundBody")}</p>
      <Link
        href="/"
        className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
      >
        {t("backHome")}
      </Link>
    </div>
  );
}
