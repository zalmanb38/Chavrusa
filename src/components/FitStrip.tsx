"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  frequencyMessageKey,
  levelMessageKey,
  timeOfDayMessageKey,
  type Frequency,
  type Level,
  type TimeOfDay,
} from "@/lib/profile-options";
import { topicName } from "@/lib/topic-names";
import {
  FIT_DIMENSIONS,
  type FitCell,
  type FitTier,
  type FitValue,
} from "@/lib/suggestions";

const dimensionLabelKey: Record<(typeof FIT_DIMENSIONS)[number], string> = {
  subject: "dimSubject",
  level: "dimLevel",
  when: "dimWhen",
  language: "dimLanguage",
  place: "dimPlace",
};

const tierLabelKey: Record<FitTier, string> = {
  strong: "tierStrong",
  good: "tierGood",
  possible: "tierPossible",
};

const tierFilled: Record<FitTier, number> = {
  strong: 3,
  good: 2,
  possible: 1,
};

/**
 * Why these two line up, as a table rather than a sentence.
 *
 * Five columns, always the same five in the same order, so a reader
 * learns the shape once and then reads down it: a column with a gold rule
 * and a value is something the two have in common, a column with a
 * hairline and a dash is something they do not. That is the whole visual
 * argument — no percentages, no badge, nothing that reads as a score out
 * of a hundred.
 */
export default function FitStrip({
  cells,
  tier,
}: {
  cells: FitCell[];
  tier: FitTier;
}) {
  const t = useTranslations("Suggested");
  const tProfile = useTranslations("Profile");
  const tLanguages = useTranslations("Languages");
  const locale = useLocale();

  const formatValue = (value: FitValue): string => {
    switch (value.kind) {
      case "topic":
        return topicName(value.topic, locale);
      case "topicOther":
        return value.text || topicName("other", locale);
      case "level":
        return tProfile(levelMessageKey[value.level as Level]);
      case "frequency":
        return tProfile(frequencyMessageKey[value.frequency as Frequency]);
      case "timeOfDay":
        return tProfile(timeOfDayMessageKey[value.timeOfDay as TimeOfDay]);
      case "sessionLength":
        return tProfile("sessionLengthValue", { minutes: value.minutes });
      case "place":
        return value.text;
      case "remote":
        return t("placeRemote");
      default:
        return "";
    }
  };

  /**
   * The language cell says two different things — what the two of them
   * would talk in, and what the text itself is in — so it is built rather
   * than joined. Running "Speaks English · Speaks Hebrew · Studies in…"
   * through the generic path made the widest column on the page out of
   * the least surprising fact on it.
   */
  const formatLanguageCell = (values: FitValue[]): string => {
    const spoken = values
      .filter((v) => v.kind === "language")
      .map((v) => tLanguages((v as { code: string }).code));
    const text = values
      .filter((v) => v.kind === "studyLanguage")
      .map((v) => tLanguages((v as { code: string }).code));
    const parts: string[] = [];
    if (spoken.length > 0) {
      parts.push(tProfile("speaksValue", { languages: spoken.join(", ") }));
    }
    if (text.length > 0) {
      parts.push(tProfile("studiesInValue", { languages: text.join(", ") }));
    }
    return parts.join(" · ");
  };

  const byDimension = new Map(cells.map((cell) => [cell.dimension, cell]));

  return (
    <div className="flex flex-col gap-2">
      {/* The tier, in the chrome voice, with three marks beside it. Gold
          is the design's figure-and-rule colour, which is exactly what
          this is: an ornament that happens to carry a number. */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-semibold tracking-[0.14em] text-accent uppercase">
          {t(tierLabelKey[tier])}
        </span>
        <span className="flex gap-[3px]" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={`h-[7px] w-[14px] ${
                i < tierFilled[tier] ? "bg-brass" : "border border-brass-tint"
              }`}
            />
          ))}
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-x-5 gap-y-2.5 sm:grid-cols-3 lg:grid-cols-5">
        {FIT_DIMENSIONS.map((dimension) => {
          const cell = byDimension.get(dimension);
          const shared = Boolean(cell?.shared && cell.values.length > 0);
          const text = !shared
            ? "—"
            : dimension === "language"
              ? formatLanguageCell(cell!.values)
              : // A subject already carries a middot between its two
                // names, so a second one between subjects would read as
                // one long list of four things.
                cell!.values.map(formatValue).join(dimension === "subject" ? ", " : " · ");
          return (
            <div
              key={dimension}
              className={`flex flex-col gap-0.5 border-t pt-1.5 ${
                shared ? "border-brass" : "border-border"
              }`}
            >
              <dt className="text-[10.5px] tracking-[0.14em] text-muted uppercase">
                {t(dimensionLabelKey[dimension])}
              </dt>
              <dd
                className={`text-[13.5px] leading-snug ${
                  shared ? "text-foreground" : "text-neutral-400"
                }`}
              >
                {text}
                {!shared && (
                  <span className="sr-only">{t("notShared")}</span>
                )}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
