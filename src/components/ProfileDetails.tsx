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
  return location ? <span className="text-sm text-muted">{location}</span> : null;
}

/**
 * One labelled line.
 *
 * Every row here has a real, visible label. An earlier version hid the
 * label on combined rows with `sr-only` — which is `position: absolute`,
 * so those rows dropped out of the grid flow, landed in the narrow label
 * column and rendered on top of each other. A grid row needs both its
 * cells present.
 */
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="pt-px text-[11px] tracking-[0.14em] text-muted uppercase">
        {label}
      </dt>
      <dd className="text-[15px] leading-snug">{children}</dd>
    </>
  );
}

/**
 * Everything about a person that is safe to show before a match, in four
 * labelled lines.
 *
 * Values are joined into one string per line rather than composed from
 * nested flex boxes — a row of small pairs looks tidy until a long value
 * wraps, and there is nothing here that a middot can't separate.
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
  const age = visibleAgeRange(profile);

  // Level, format and age — each a word or two, so one line between them.
  // Format uses its own list wording: "Both" alone answers a question the
  // reader can no longer see once the label is gone.
  const about = [
    profile.level && tProfile(levelMessageKey[profile.level]),
    tProfile(preferenceListKey[profile.preference as Preference]),
    age,
  ].filter(Boolean) as string[];

  const languages = [
    profile.languages?.length > 0 &&
      tProfile("speaksValue", {
        languages: profile.languages
          .map((l: LanguageCode) => tLanguages(l))
          .join(" · "),
      }),
    profile.study_languages?.length > 0 &&
      tProfile("studiesInValue", {
        languages: profile.study_languages
          .map((l) => tLanguages(l))
          .join(" · "),
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
    <div className={`flex flex-col ${compact ? "gap-1.5" : "gap-3"}`}>
      <dl
        className={`grid gap-x-4 sm:grid-cols-[5rem_1fr] ${
          compact ? "gap-y-0.5" : "gap-y-1.5"
        }`}
      >
        {topics.length > 0 && (
          <Row label={tProfile("topicsShort")}>{topics.join(" · ")}</Row>
        )}
        {about.length > 0 && (
          <Row label={tProfile("aboutShort")}>{about.join(" · ")}</Row>
        )}
        {languages.length > 0 && (
          <Row label={tProfile("languagesShort")}>{languages.join(" · ")}</Row>
        )}
        {available.length > 0 && (
          <Row label={tProfile("availableShort")}>{available.join(" · ")}</Row>
        )}
      </dl>

      {profile.blurb && (
        <p
          className={`max-w-[46em] border-s-2 border-brass ps-3 text-[15px] italic ${
            compact ? "line-clamp-1" : ""
          }`}
        >
          {profile.blurb}
        </p>
      )}
    </div>
  );
}
