import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import ImageSlot from "@/components/ImageSlot";

// "Label — the only chrome voice": 11px here, matching ProfileDetails'
// own field labels rather than the page's section labels.
const labelClass = "text-[11px] tracking-[0.14em] text-muted uppercase";

/**
 * What a signed-out visitor gets at /browse.
 *
 * Built to Zalman's brief and the mock-up of 26 Oct: hero with a photo,
 * a gated preview of what is behind the wall, how it works, and a closing
 * panel. The vocabulary stays the site's own — hairline rules,
 * square corners, brass accents — so this reads as the same paper as the
 * homepage rather than a visitor from another design.
 *
 * The count is the only number on the page, and it is real. The preview
 * below it is Browse's own row — the same grid, hairlines and right rail
 * — with everything that would name or describe a person left as a grey
 * shape. The original wall handoff was explicit that invented listings
 * must never appear here: somebody who signs up on the strength of four
 * plausible learners and finds none of them is owed an apology no copy
 * can make. The shape is the sneak peek; the values arrive with the
 * sign-in.
 */

// Hairline weight, brass, inherits the text colour where it should.
function LockIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden
      className={className}
    >
      <rect x="4.5" y="10.5" width="15" height="10" />
      <path d="M8 10.5V7a4 4 0 1 1 8 0v3.5" />
    </svg>
  );
}

export default async function BrowseWall({
  learnerCount,
}: {
  learnerCount: number;
}) {
  const t = await getTranslations("BrowseWall");
  // The redacted rows borrow Browse's own labels and status wording
  // rather than inventing a second set of words for the same fields.
  const tp = await getTranslations("Profile");

  // Both routes carry the destination, so signing in lands back on Browse
  // rather than on a profile page.
  const signupHref = { pathname: "/signup", query: { next: "/browse" } };
  const loginHref = { pathname: "/login", query: { next: "/browse" } };

  return (
    <div className="flex flex-col">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="mx-auto grid w-full max-w-[1240px] items-center gap-12 px-6 pt-14 pb-14 sm:px-14 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="flex flex-col items-start gap-4">
          {/* A Hebrew run inside an otherwise-English page, so lang and dir
              sit on the line itself rather than on the section. */}
          <p lang="he" dir="rtl" className="text-[22px] text-brass-deep">
            מי לומד כאן
          </p>

          <h1 className="text-[2.25rem] leading-[1.05] font-semibold sm:text-[3.25rem]">
            {t("heading")}
          </h1>

          <p className="max-w-[24em] text-[19px] font-semibold text-balance sm:text-[21px]">
            {t("count", { count: learnerCount })}
          </p>

          <p className="max-w-[32em] text-[17px] leading-relaxed">{t("body")}</p>

          <div className="flex flex-wrap gap-3 pt-1">
            <Link
              href={signupHref}
              className="bg-primary px-[26px] py-[14px] text-base font-semibold text-primary-foreground hover:bg-slate-600"
            >
              {t("createAccount")}
            </Link>
            <Link
              href={loginHref}
              className="border border-border px-[26px] py-[14px] text-base hover:bg-surface"
            >
              {t("signIn")}
            </Link>
          </div>

          <p className="flex items-start gap-2 pt-1 text-[13.5px] text-muted">
            <LockIcon className="mt-px h-[15px] w-[15px] shrink-0 text-brass" />
            <span>{t("reassurance")}</span>
          </p>
        </div>

        <ImageSlot
          direction={t("heroImageDirection")}
          src="/photos/p4-two-seforim.jpg"
          alt=""
          height={360}
          priority
        />
      </section>

      {/* ── Gated preview: Browse's own rows, with the people redacted ── */}
      {/* Hidden rather than shown empty: a preview of nothing argues
          against the count above it. */}
      {learnerCount > 0 && (
        <section className="mx-auto w-full max-w-[1240px] px-6 pb-16 sm:px-14">
          <div className="border-t border-border pt-6">
            <h2 className="text-[30px] font-semibold">{t("previewTitle")}</h2>
            <p className="mt-2 max-w-[40em] text-[15px] text-muted">
              {t("previewBody")}
            </p>
          </div>

          {/* Deliberately the same grid, hairlines and right rail as
              BrowseCard, so this reads as the page itself with the people
              taken out rather than as a different page's idea of it. What
              would name or describe somebody is a grey shape: the values
              are real only once you are signed in, and inventing them is
              the one thing this page must not do. */}
          <ul className="mt-6">
            {Array.from({ length: Math.min(learnerCount, 4) }, (_, row) => (
              <li
                key={row}
                className="grid gap-6 border-t border-border py-4 lg:grid-cols-[1fr_200px]"
              >
                <div className="flex flex-col gap-2.5">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    {/* The name's line, at the name's weight. Signed-out
                        visitors genuinely cannot see names, so this one
                        is honestly blank rather than filled in. */}
                    <div aria-hidden className="h-[21px] w-40 bg-neutral-300" />
                    {/* True of every row Browse shows: it filters on the
                        looking flag, so everybody behind this wall is. */}
                    <span className="text-[13.5px] text-muted">
                      {tp("lookingLegend")}
                    </span>
                  </div>

                  {/* The label is structure, so it is real; the values are
                      a person's, so they are not here yet. */}
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className={labelClass}>{tp("topicsShort")}</span>
                    <span aria-hidden className="flex flex-wrap gap-1.5">
                      <span className="block h-[22px] w-24 bg-slate-200" />
                      <span className="block h-[22px] w-20 bg-slate-200" />
                      <span className="block h-[22px] w-16 bg-neutral-200" />
                    </span>
                  </div>

                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className={labelClass}>{tp("availableShort")}</span>
                    <span
                      aria-hidden
                      className="block h-[15px] w-full max-w-[18rem] bg-neutral-200"
                    />
                  </div>
                </div>

                <div className="flex flex-col items-start gap-3 lg:border-s lg:border-border lg:ps-6">
                  <span className="flex items-center gap-2 text-[13.5px] text-muted">
                    <LockIcon className="h-[14px] w-[14px] shrink-0 text-brass" />
                    {t("previewLocked")}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── How it works ─────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-[1240px] px-6 pb-16 sm:px-14">
        <div className="border-t border-border pt-6">
          <h2 className="text-[30px] font-semibold">{t("howTitle")}</h2>
        </div>

        {/* Hairline dividers between the steps rather than cards: the rule
            is the site's only separator. They are start-edge borders, so
            they land on the right of each column on the Hebrew site, and
            the first column's is suppressed. */}
        <div className="mt-8 grid gap-y-8 sm:grid-cols-3">
          {[1, 2, 3].map((step) => (
            <div
              key={step}
              className="flex items-start gap-4 border-border ps-0 sm:border-s sm:ps-6 sm:first:border-s-0 sm:first:ps-0"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brass-tint text-[17px] font-semibold text-slate-900">
                {step}
              </span>
              <div className="flex flex-col">
                <h3 className="mb-1 text-[19px] font-semibold text-balance">
                  {t(`step${step}Title`)}
                </h3>
                <p className="text-[15px] leading-[1.7] text-muted text-pretty">
                  {t(`step${step}Body`)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Closing panel ────────────────────────────────────────────── */}
      {/* A tinted panel rather than the homepage's full-bleed band: this
          page already carries a photograph above the fold, and two
          full-width colour events would fight each other. */}
      <section className="mx-auto w-full max-w-[1240px] px-6 pb-20 sm:px-14">
        <div className="flex flex-col items-start justify-between gap-6 bg-slate-100 px-7 py-8 sm:px-10 sm:py-9 lg:flex-row lg:items-center">
          <div className="flex max-w-[34em] flex-col gap-2">
            <h2 className="text-[26px] font-semibold sm:text-[30px]">
              {t("finalTitle")}
            </h2>
            <p className="text-[16px] leading-relaxed">{t("finalBody")}</p>
          </div>

          <div className="flex shrink-0 flex-wrap gap-3">
            <Link
              href={signupHref}
              className="bg-primary px-[26px] py-[14px] text-base font-semibold text-primary-foreground hover:bg-slate-600"
            >
              {t("createAccount")}
            </Link>
            <Link
              href={loginHref}
              className="border border-border bg-background px-[26px] py-[14px] text-base hover:bg-surface"
            >
              {t("signIn")}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
