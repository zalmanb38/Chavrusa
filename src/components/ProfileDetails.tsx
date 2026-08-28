"use client";

import { useTranslations } from "next-intl";
import {
  topicLabels,
  preferenceListKey,
  levelMessageKey,
  frequencyMessageKey,
  timeOfDayMessageKey,
  type Profile,
  type LanguageCode,
  type Preference,
  type Frequency,
  type TimeOfDay,
  ageRangeLabel,
} from "@/lib/profile-options";
import { formatLocationShort } from "@/lib/locations";
import { visibleAgeRange } from "@/lib/browse-filters";

/**
 * Everything about a person that is safe to show before a match.
 *
 * Shared by Browse and the Requests page so the two can't describe the
 * same person differently. Note what isn't here: full name and photo,
 * both governed by the match-reveal rule, and neither ever passed to this
 * component in the first place.
 */
export type ProfileDetailFields = Pick<
  Profile,
  | "languages"
  | "study_languages"
  | "topics"
  | "topic_other"
  | "level"
  | "city"
  | "country"
  | "region"
  | "neighborhood"
  | "preference"
  | "availability"
  | "age_range"
  | "frequency"
  | "time_of_day"
  | "session_length"
  | "blurb"
  | "hidden_fields"
>;

export function ProfileLocation({ profile }: { profile: ProfileDetailFields }) {
  const location = formatLocationShort(profile);
  return location ? <span>{location}</span> : null;
}

/**
 * A tag.
 *
 * The handoff calls for these on result rows — "slate-blue tags for
 * subjects, neutral tags for level and languages" — and they do the job a
 * middot list couldn't: a subject is findable at a glance, because it has
 * an edge, rather than being a word inside a sentence of other words.
 */
function Tag({
  children,
  tone = "neutral",
  lang,
}: {
  children: React.ReactNode;
  tone?: "subject" | "neutral";
  lang?: string;
}) {
  return (
    <span
      lang={lang}
      className={`px-2 py-0.5 text-[13px] leading-snug ${
        tone === "subject"
          ? "bg-slate-100 text-slate-700"
          : "bg-neutral-200 text-neutral-800"
      }`}
    >
      {children}
    </span>
  );
}

/** One labelled line, for the values that read as prose rather than tags. */
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
      <span className="text-[11px] tracking-[0.14em] text-muted uppercase">
        {label}
      </span>
      <span className="text-[14.5px] text-muted">{children}</span>
    </div>
  );
}

/**
 * Everything about a person that is safe to show before a match.
 *
 * Two bands of tags, then availability as a line. Tags carry the facts
 * that get scanned — what someone learns, at what level, in which
 * language — and the label/value grid is gone: it cost a fixed column of
 * width on every row to repeat words the tags now say for themselves.
 *
 * `compact` is for lists, where the job is scanning many people rather
 * than reading one.
 */
export default function ProfileDetails({
  profile,
  compact = false,
}: {
  profile: ProfileDetailFields;
  compact?: boolean;
}) {
  const tProfile = useTranslations("Profile");
  const tTopics = useTranslations("Topics");
  const tLanguages = useTranslations("Languages");

  const topics = topicLabels(profile.topics, profile.topic_other, tTopics);
  const storedAge = visibleAgeRange(profile);
  const age = storedAge ? ageRangeLabel(storedAge, tProfile) : "";

  const facts = [
    profile.level && tProfile(levelMessageKey[profile.level]),
    tProfile(preferenceListKey[profile.preference as Preference]),
    age,
    profile.languages?.length > 0 &&
      tProfile("speaksValue", {
        languages: profile.languages
          .map((l: LanguageCode) => tLanguages(l))
          .join(", "),
      }),
    profile.study_languages?.length > 0 &&
      tProfile("studiesInValue", {
        languages: profile.study_languages
          .map((l) => tLanguages(l))
          .join(", "),
      }),
  ].filter(Boolean) as string[];

  const available = [
    profile.frequency &&
      tProfile(frequencyMessageKey[profile.frequency as Frequency]),
    profile.time_of_day &&
      tProfile(timeOfDayMessageKey[profile.time_of_day as TimeOfDay]),
    profile.session_length &&
      tProfile("sessionLengthValue", {
        minutes: Number(profile.session_length),
      }),
    profile.availability?.trim(),
  ].filter(Boolean) as string[];

  return (
    <div className={`flex flex-col ${compact ? "gap-1.5" : "gap-2.5"}`}>
      {topics.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {topics.map((topic) => (
            <Tag key={topic} tone="subject">
              {topic}
            </Tag>
          ))}
        </div>
      )}

      {facts.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {facts.map((fact) => (
            <Tag key={fact}>{fact}</Tag>
          ))}
        </div>
      )}

      {available.length > 0 && (
        <Row label={tProfile("availableShort")}>{available.join(" · ")}</Row>
      )}

      {profile.blurb && (
        <p
          className={`max-w-[46em] border-s-2 border-brass ps-3 text-[14.5px] text-muted italic ${
            compact ? "line-clamp-1" : ""
          }`}
        >
          {profile.blurb}
        </p>
      )}
    </div>
  );
}
