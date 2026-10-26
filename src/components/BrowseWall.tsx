import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import ImageSlot from "@/components/ImageSlot";
import { topicNameEn, topicNameHe } from "@/lib/topic-names";
import type { TopicKey } from "@/lib/profile-options";

/**
 * What a signed-out visitor gets at /browse.
 *
 * Built to Zalman's brief and the mock-up of 26 Oct: hero with a photo,
 * a gated preview of what is behind the wall, how it works, why join, and
 * a closing panel. The vocabulary stays the site's own — hairline rules,
 * square corners, brass accents — so this reads as the same paper as the
 * homepage rather than a visitor from another design.
 *
 * Every number and every subject here is real. The mock-up's cards carry
 * an availability, a neighbourhood and a level; those are invented the
 * moment they are written, and the original wall handoff was explicit
 * that invented listings must never appear here — somebody who signs up
 * on the strength of four plausible listings and finds none of them is
 * owed an apology no copy can make. So each card carries the subject and
 * the count, which are true, and the lines the mock-up fills with sample
 * values are left as the blurred shapes of a gated card.
 */

// "Label — the only chrome voice": 11.5px, wide tracking, uppercase.
const labelClass =
  "text-[11.5px] tracking-[0.14em] text-muted uppercase";

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

const WHY_ICONS = [
  // Free to sign up — a tick in a circle.
  "M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17Z M8.5 12.2l2.4 2.4 4.6-5",
  // Learners looking for a partner — two figures.
  "M9.5 11.2a3.1 3.1 0 1 0 0-6.2 3.1 3.1 0 0 0 0 6.2Z M3.8 20c0-3.1 2.6-5.7 5.7-5.7s5.7 2.6 5.7 5.7 M16.8 5.6a3 3 0 0 1 0 5.6 M17.8 14.6c1.6.9 2.7 2.6 2.7 4.6",
  // Verified — a shield with a tick.
  "M12 3.5 19 6v6c0 4-3 7-7 8.5C8 19 5 16 5 12V6l7-2.5Z M9.2 12.1l2 2 3.6-3.9",
  // Meaningful connections — a heart.
  "M12 20.2C10.4 19.1 4.8 15.1 4.8 10.8A3.9 3.9 0 0 1 12 8.6a3.9 3.9 0 0 1 7.2 2.2c0 4.3-5.6 8.3-7.2 9.4Z",
] as const;

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

      {/* ── Gated preview of what is behind the wall ─────────────────── */}
      {/* Hidden rather than shown empty: a preview section with nothing in
          it argues against the count above it. */}
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
                className="flex flex-col gap-1 bg-surface px-6 py-[22px]"
              >
                <span className={labelClass}>{t("previewFocus")}</span>
                {/* A pure-Hebrew run, so bidi sets it right-to-left on its
                    own; no dir of its own, which is what lets it align to
                    the card's start edge in both directions instead of
                    sitting in the opposite corner from the English name
                    below it. */}
                <span
                  lang="he"
                  className="text-start text-[26px] leading-tight text-brass-deep"
                >
                  {topicNameHe(topic)}
                </span>
                <span className="text-[17px]">{topicNameEn(topic)}</span>
                <span className="text-[12.5px] text-muted">
                  {t("previewLearners", { count: learners })}
                </span>

                {/* The shape of the fields a signed-in visitor gets —
                    availability, place, how often — with no values in
                    them, because inventing the values is the one thing
                    this page must not do. mt-auto so the locked line sits
                    at the same height across a row of uneven cards. */}
                <div
                  aria-hidden
                  className="mt-4 flex flex-col gap-2 pt-1 opacity-45"
                >
                  <div className="h-3 w-4/5 bg-neutral-300" />
                  <div className="h-3 w-3/5 bg-neutral-300" />
                </div>

                <span className="mt-auto flex items-center gap-2 border-t border-border pt-3 text-[12.5px] text-muted">
                  <LockIcon className="h-[13px] w-[13px] shrink-0 text-brass" />
                  {t("previewLocked")}
                </span>
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

      {/* ── Why join ─────────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-[1240px] px-6 pb-16 sm:px-14">
        <div className="border-t border-border pt-6">
          <h2 className="text-[30px] font-semibold">{t("whyTitle")}</h2>
        </div>

        <ul className="mt-8 grid gap-y-7 sm:grid-cols-2 lg:grid-cols-4">
          {WHY_ICONS.map((path, i) => (
            <li
              key={i}
              className="flex items-start gap-3 border-border lg:border-s lg:ps-6 lg:first:border-s-0 lg:first:ps-0"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden
                className="mt-px h-[22px] w-[22px] shrink-0 text-brass"
              >
                <path d={path} />
              </svg>
              <span className="text-[15.5px] leading-[1.6] text-pretty">
                {t(`why${i + 1}`)}
              </span>
            </li>
          ))}
        </ul>
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
