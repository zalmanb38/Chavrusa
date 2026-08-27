import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import ImageSlot from "@/components/ImageSlot";

// Reached both by an unmatched URL and by an explicit notFound() — the
// admin routes use it deliberately, so that a signed-in non-admin can't
// tell a forbidden page from one that doesn't exist.
export default async function NotFound() {
  const t = await getTranslations("ErrorPages");

  return (
    <div className="mx-auto flex max-w-md flex-col items-start gap-4 px-4 py-24">
      <p className="font-serif text-5xl font-medium text-primary">404</p>
      <ImageSlot
        direction="A well-worn siddur"
        src="/photos/p8-worn-siddur.jpg"
        alt=""
        height={200}
      />
      <h1 className="text-[2rem] font-semibold sm:text-[34px]">{t("notFoundTitle")}</h1>
      <p className="text-muted">{t("notFoundBody")}</p>
      <Link
        href="/"
        className="rounded-sm bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
      >
        {t("backHome")}
      </Link>
    </div>
  );
}
