import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import ImageSlot from "@/components/ImageSlot";
import { topicNameEn, topicNameHe } from "@/lib/topic-names";
import type { TopicKey } from "@/lib/profile-options";

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
  subjects,
}: {
  learnerCount: number;
  /** Real subjects with at least one learner, most learners first. */
  subjects: { topic: TopicKey; learners: number }[];
}) {
  const t = await getTranslations("BrowseWall");

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

      {/* ── Gated preview of what is behind the wall ─────────────── */}
      {/* Hidden rather than shown empty: a preview of nothing argues
          against the count above it. */}
      {subjects.length > 0 && (
        <section className="mx-auto w-full max-w-[1240px] px-6 pb-16 sm:px-14">
          <div className="border-t border-border pt-6">
            <h2 className="text-[30px] font-semibold">{t("previewTitle")}</h2>
            <p className="mt-2 max-w-[40em] text-[15px] text-muted">
              {t("previewBody")}
            </p>
          </div>

          <div className="mt-8 grid gap-[18px] sm:grid-cols-2 lg:grid-cols-4">
            {subjects.map(({ topic, learners }) => (
              <div
                key={topic}
                className="flex flex-col gap-3 bg-surface px-5 py-5"
              >
                <div className="flex items-start gap-3">
                  {/* The portrait a signed-in visitor doesn't get either:
                      photographs are match-only, so this one stays a
                      shape at every stage. */}
                  <span
                    aria-hidden
                    className="mt-0.5 h-10 w-10 shrink-0 rounded-full bg-neutral-300"
                  />
                  <span className="flex flex-col">
                    <span className={labelClass}>{t("previewFocus")}</span>
                    {/* A pure-Hebrew run, so bidi sets it right-to-left on
                        its own; no dir of its own, which is what lets it
                        align to the card's start edge in both directions
                        instead of sitting in the opposite corner from the
                        English name below it. */}
                    <span
                      lang="he"
                      className="text-start text-[22px] leading-tight text-brass-deep"
                    >
                      {topicNameHe(topic)}
                    </span>
                    <span className="text-[16px] leading-tight">
                      {topicNameEn(topic)}
                    </span>
                  </span>
                </div>

                <span className="text-[12.5px] text-muted">
                  {t("previewLearners", { count: learners })}
                </span>

                {/* The fields that belong to a person — availability,
                    place, how often — behind the lock that actually
                    holds them. Shapes, not sample values: inventing the
                    values is the one thing this page must not do. */}
                <div className="relative mt-1">
                  <div
                    aria-hidden
                    className="flex min-h-[112px] flex-col justify-between gap-3 opacity-40 blur-[1.5px]"
                  >
                    <div className="h-3.5 w-4/5 bg-neutral-300" />
                    <div className="h-3.5 w-3/5 bg-neutral-300" />
                    <div className="h-3.5 w-2/3 bg-neutral-300" />
                    <div className="h-3.5 w-1/2 bg-neutral-300" />
                  </div>

                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-center">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brass-tint">
                      <LockIcon className="h-4 w-4 text-slate-900" />
                    </span>
                    <span className="text-[12.5px] leading-tight text-muted">
                      {t("previewLocked")}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
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
