import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import ImageSlot from "@/components/ImageSlot";
import { createClient } from "@/lib/supabase/server";

/**
 * The homepage, rebuilt to the Broadsheet handoff.
 *
 * Load-bearing rules from the design, easy to lose in a refactor:
 * whitespace and hairlines instead of boxes; the section-head pattern
 * (1px top rule, then H2 baseline-aligned against a small uppercase
 * label); content hugging the left with air held on the right; and
 * exactly one full-bleed colour band per page — here, the closing CTA.
 */

const SUBJECTS = [
  { key: "gemara", hebrew: "גמרא" },
  { key: "chumash", hebrew: "חומש" },
  { key: "mishnah", hebrew: "משנה" },
  { key: "chassidus", hebrew: "חסידות" },
] as const;

const STEPS = ["01", "02", "03", "04"] as const;

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Home");
  const tTopics = await getTranslations("Topics");

  // Real counts, not the design's sample figures. Comes from a
  // security-definer function because this page is public and profiles
  // are not — it returns counts and nothing else.
  const supabase = await createClient();
  const { data: counts, error: countsError } = await supabase.rpc(
    "subject_counts",
  );
  if (countsError) console.error("Subject counts unavailable", countsError);

  const learnersByTopic = new Map(
    ((counts ?? []) as { topic: string; learners: number }[]).map((row) => [
      row.topic,
      Number(row.learners),
    ]),
  );

  return (
    <div className="flex flex-col">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="mx-auto grid w-full max-w-[1240px] items-center gap-14 px-6 pt-16 pb-16 sm:px-14 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="flex flex-col items-start gap-5">
          {/*
            Pirkei Avos 1:6. The nikud is part of the text and must not be
            stripped; lang and dir are set on the span itself because this
            is a Hebrew run inside an otherwise-English page, not a
            direction change for the whole element.
          */}
          <p
            lang="he"
            dir="rtl"
            className="text-[22px] text-brass-deep"
          >
            וּקְנֵה לְךָ חָבֵר
          </p>

          <h1 className="max-w-[14em] text-[2.75rem] leading-[1.04] font-semibold sm:text-[3.875rem]">
            {t("heroTitle")}
          </h1>

          <p className="max-w-[30em] text-[19px] leading-relaxed">
            {t("heroLead")}
          </p>

          <div className="flex flex-wrap gap-3 pt-1">
            <Link
              href="/signup"
              className="bg-primary px-[26px] py-[14px] text-base font-semibold text-primary-foreground hover:bg-slate-600"
            >
              {t("getStarted")}
            </Link>
            <Link
              href="/browse"
              className="border border-border px-[26px] py-[14px] text-base hover:bg-surface"
            >
              {t("browseChavrusas")}
            </Link>
          </div>

          <p className="text-[13.5px] text-muted">{t("heroReassurance")}</p>
        </div>

        <ImageSlot
          direction={t("heroImageDirection")}
          src="/photos/p1-gemara-shtender.jpg"
          alt=""
          height={400}
          priority
        />
      </section>

      {/* ── How the matching works ───────────────────────────────────── */}
      <section id="how" className="mx-auto w-full max-w-[1240px] px-6 pb-20 sm:px-14">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-t border-border pt-6">
          <h2 className="text-[30px] font-semibold">{t("howTitle")}</h2>
          <span className="text-[11.5px] tracking-[0.14em] text-muted uppercase">
            {t("howLabel")}
          </span>
        </div>

        {/* Row gap is the larger one: once the grid folds to two columns and
            then one, the steps stack, and the space that reads as "between
            columns" horizontally is far too tight vertically. */}
        <div className="mt-12 grid items-start gap-x-[34px] gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((numeral, i) => (
            <div key={numeral} className="flex flex-col border-t-2 border-brass pt-4">
              <span className="mb-3 text-[34px] leading-none text-brass">
                {numeral}
              </span>
              {/* Two lines' worth of floor: titles run to one or two lines
                  depending on the language, and without it the bodies start
                  at different heights across the four columns. */}
              <h3 className="mb-2 text-[21px] font-semibold text-balance lg:min-h-[3em]">
                {t(`step${i + 1}Title`)}
              </h3>
              <p className="text-[15px] leading-[1.7] text-muted text-pretty">
                {t(`step${i + 1}Body`)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── What people are learning ─────────────────────────────────── */}
      <section className="mx-auto w-full max-w-[1240px] px-6 pb-16 sm:px-14">
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-t border-border pt-6">
          <h2 className="text-[30px] font-semibold">{t("subjectsTitle")}</h2>
          <Link
            href="/browse"
            className="text-sm text-slate-600 underline hover:text-brass"
          >
            {t("seeAllSubjects")}
          </Link>
        </div>

        <div className="mt-8 grid gap-[18px] sm:grid-cols-2 lg:grid-cols-4">
          {SUBJECTS.map((subject) => (
            <Link
              key={subject.key}
              href={{ pathname: "/browse", query: { topic: subject.key } }}
              className="flex flex-col gap-1 bg-surface px-6 py-[22px] hover:bg-neutral-200"
            >
              {/* Hebrew as an accent inside an English interface — its own
                  direction, not the tile's. */}
              <span lang="he" dir="rtl" className="text-[26px] leading-tight">
                {subject.hebrew}
              </span>
              <span className="text-[17px]">{tTopics(subject.key)}</span>
              {/* Omitted rather than shown as zero: a card reading "0
                  learners" is worse than one that simply doesn't claim a
                  number yet. */}
              {(learnersByTopic.get(subject.key) ?? 0) > 0 && (
                <span className="text-[12.5px] text-muted">
                  {t("subjectLearners", {
                    count: learnersByTopic.get(subject.key) ?? 0,
                  })}
                </span>
              )}
            </Link>
          ))}
        </div>
      </section>

      {/* ── Closing CTA: the one full-bleed colour band on the page ──── */}
      <section className="bg-primary text-ivory">
        <div className="mx-auto grid w-full max-w-[1240px] items-center gap-10 px-6 py-16 sm:px-14 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="flex flex-col gap-3">
            <h2 className="text-[2rem] font-semibold sm:text-[38px]">
              {t("ctaTitle")}
            </h2>
            <p className="max-w-[34em] text-ivory/90">{t("ctaBody")}</p>
          </div>

          {/*
            A plain GET form rather than a scripted capture: it hands the
            address to the sign-up page, which is the only thing the
            design's input can usefully do here, and it works with no
            JavaScript.
          */}
          <form action={`/${locale}/signup`} className="flex flex-col gap-3">
            <label htmlFor="cta-email" className="sr-only">
              {t("ctaEmailLabel")}
            </label>
            <input
              id="cta-email"
              type="email"
              name="email"
              placeholder={t("ctaEmailPlaceholder")}
              className="min-h-[46px] border border-ivory/30 bg-ivory/10 px-4 text-ivory placeholder:text-ivory/60 focus:border-ivory focus:outline-none"
            />
            <button
              type="submit"
              className="min-h-[46px] bg-brass px-6 font-semibold text-slate-900 hover:bg-brass-tint"
            >
              {t("getStarted")}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
