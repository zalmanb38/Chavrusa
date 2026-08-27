import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

/**
 * What a signed-out visitor gets at /browse.
 *
 * The count is real; the rows behind it are deliberately empty shapes.
 * The handoff is explicit that invented names must never appear behind
 * this wall, and it is right — a visitor who signs up on the strength of
 * five plausible-looking listings and finds none of them is owed an
 * apology no copy can make.
 */
export default async function BrowseWall({
  learnerCount,
}: {
  learnerCount: number;
}) {
  const t = await getTranslations("BrowseWall");

  return (
    <div className="mx-auto w-full max-w-[1240px] px-6 py-16 sm:px-11">
      <div className="flex max-w-[34em] flex-col items-start gap-4">
        <p lang="he" dir="rtl" className="text-[22px] text-brass-deep">
          מי לומד כאן
        </p>

        <h1 className="text-[2rem] font-semibold sm:text-[34px]">
          {t("count", { count: learnerCount })}
        </h1>

        <p className="text-[17px] leading-relaxed">{t("body")}</p>

        <div className="flex flex-wrap gap-3 pt-1">
          {/* Both routes carry the destination, so signing in lands back
              on Browse rather than on a profile page. */}
          <Link
            href={{ pathname: "/signup", query: { next: "/browse" } }}
            className="bg-primary px-6 py-3 text-base font-semibold text-primary-foreground hover:bg-slate-600"
          >
            {t("createAccount")}
          </Link>
          <Link
            href={{ pathname: "/login", query: { next: "/browse" } }}
            className="border border-border px-6 py-3 text-base hover:bg-surface"
          >
            {t("signIn")}
          </Link>
        </div>
      </div>

      {/* Two empty listing shapes. No names, no subjects, no availability
          — the shape of the page, not a preview of its contents. */}
      <div className="mt-12 flex flex-col opacity-40" aria-hidden>
        {[0, 1].map((row) => (
          <div
            key={row}
            className="grid gap-6 border-t border-border py-6 lg:grid-cols-[1fr_200px]"
          >
            <div className="flex flex-col gap-3">
              <div className="h-6 w-56 bg-neutral-300" />
              <div className="flex gap-1.5">
                <div className="h-5 w-20 bg-neutral-200" />
                <div className="h-5 w-24 bg-neutral-200" />
                <div className="h-5 w-16 bg-neutral-200" />
              </div>
              <div className="h-4 w-full max-w-md bg-neutral-200" />
            </div>
            <div className="h-9 w-full bg-neutral-200 lg:w-40" />
          </div>
        ))}
      </div>
    </div>
  );
}
