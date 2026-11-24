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
  type FitValue,
} from "@/lib/suggestions";

const dimensionLabelKey: Record<(typeof FIT_DIMENSIONS)[number], string> = {
  subject: "dimSubject",
  level: "dimLevel",
  when: "dimWhen",
  language: "dimLanguage",
  place: "dimPlace",
};

/**
 * Why these two line up, as a table rather than a sentence.
 *
 * Five columns, always the same five in the same order, so a reader
 * learns the shape once and then reads down it. A column the two have in
 * common is a tinted block under a gold rule; one they do not is left
 * plain and grey. Above them, the count of the five — "4 of 5 in
 * common" — because a reader should not have to decode an ornament to
 * learn how good a fit is, and the number is one they can check against
 * the row beneath it.
 */
export default function FitStrip({
  cells,
  leadTopic,
}: {
  cells: FitCell[];
  /** The subject whose section this row is in; shown first. */
  leadTopic?: string;
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
  const sharedCount = FIT_DIMENSIONS.filter((dimension) => {
    const cell = byDimension.get(dimension);
    return Boolean(cell?.shared && cell.values.length > 0);
  }).length;

  return (
    <div className="flex flex-col gap-2">
      {/* Said in words and a number, not in marks. */}
      <p className="text-[11.5px] font-semibold tracking-[0.14em] text-accent uppercase">
        {t("inCommon", { count: sharedCount })}
      </p>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-3 lg:grid-cols-5">
        {FIT_DIMENSIONS.map((dimension) => {
          const cell = byDimension.get(dimension);
          const shared = Boolean(cell?.shared && cell.values.length > 0);
          const text = !shared
            ? "—"
            : dimension === "language"
              ? formatLanguageCell(cell!.values)
              : dimension === "subject"
                ? // The section's own subject leads, then the rest. Under
                  // a "Gemara" heading, a cell starting "Chumash" reads
                  // like the wrong row. A subject already carries a
                  // middot between its two names, so these are joined
                  // with a comma rather than a second one.
                  [...cell!.values]
                    .sort(
                      (a, b) =>
                        Number(b.kind === "topic" && b.topic === leadTopic) -
                        Number(a.kind === "topic" && a.topic === leadTopic),
                    )
                    .map(formatValue)
                    .join(", ")
                : cell!.values.map(formatValue).join(" · ");
          return (
            <div
              key={dimension}
              className={`flex flex-col gap-0.5 border-t-2 px-2 pt-1.5 pb-2 ${
                shared
                  ? "border-brass bg-neutral-100"
                  : "border-neutral-300 bg-transparent"
              }`}
            >
              <dt className="text-[10.5px] tracking-[0.14em] text-muted uppercase">
                {t(dimensionLabelKey[dimension])}
              </dt>
              <dd
                className={`text-[13.5px] leading-snug ${
                  shared ? "font-medium text-foreground" : "text-neutral-400"
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
