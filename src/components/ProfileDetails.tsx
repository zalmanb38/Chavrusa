"use client";

import { useTranslations } from "next-intl";
import {
  topicLabels,
  preferenceMessageKey,
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

/** A label/value pair on its own line. */
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="pt-px text-[11px] tracking-[0.14em] text-muted uppercase">
        {label}
      </dt>
      <dd className="text-[15px]">{children}</dd>
    </>
  );
}

/**
 * A label/value pair that sits inline with others on a shared line.
 *
 * Used where several facts are each a word or two: three rows holding
 * "Advanced", "Both" and "18-22" cost three lines to say almost nothing,
 * but dropping their labels to compress them would leave values like
 * "Both" with no way to tell what they answer.
 */
function Pair({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="text-[11px] tracking-[0.14em] text-muted uppercase">
        {label}
      </span>
      <span className="text-[15px]">{value}</span>
    </span>
  );
}

/**
 * Everything about a person that is safe to show before a match.
 *
 * `compact` is for lists, where the job is scanning many people rather
 * than reading one: tighter leading, and a blurb clipped to two lines
 * instead of running to its 400-character cap.
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

  const rhythm = [
    profile.frequency &&
      tProfile(frequencyMessageKey[profile.frequency as Frequency]),
    profile.time_of_day &&
      tProfile(timeOfDayMessageKey[profile.time_of_day as TimeOfDay]),
    profile.session_length &&
      tProfile("sessionLengthValue", {
        minutes: Number(profile.session_length),
      }),
  ].filter(Boolean) as string[];

  return (
    <div className={`flex flex-col ${compact ? "gap-2" : "gap-3"}`}>
      <dl
        className={`grid gap-x-4 sm:grid-cols-[5.5rem_1fr] ${
          compact ? "gap-y-1" : "gap-y-2"
        }`}
      >
        {topics.length > 0 && (
          <Row label={tProfile("topicsShort")}>{topics.join(" · ")}</Row>
        )}

        {/* Level, format and age: one line, each still labelled. */}
        <dt className="sr-only">{tProfile("aboutShort")}</dt>
        <dd className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          {profile.level && (
            <Pair
              label={tProfile("levelShort")}
              value={tProfile(levelMessageKey[profile.level])}
            />
          )}
          <Pair
            label={tProfile("formatShort")}
            value={tProfile(preferenceMessageKey[profile.preference as Preference])}
          />
          {age && <Pair label={tProfile("ageShort")} value={age} />}
        </dd>

        {/* Both languages describe the same thing from two sides. */}
        {(profile.languages?.length > 0 ||
          profile.study_languages?.length > 0) && (
          <>
            <dt className="sr-only">{tProfile("languagesShort")}</dt>
            <dd className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              {profile.languages?.length > 0 && (
                <Pair
                  label={tProfile("speaksShort")}
                  value={profile.languages
                    .map((l: LanguageCode) => tLanguages(l))
                    .join(" · ")}
                />
              )}
              {profile.study_languages?.length > 0 && (
                <Pair
                  label={tProfile("studiesInShort")}
                  value={profile.study_languages
                    .map((l) => tLanguages(l))
                    .join(" · ")}
                />
              )}
            </dd>
          </>
        )}

        {(rhythm.length > 0 || profile.availability) && (
          <Row label={tProfile("availableShort")}>
            {[rhythm.join(" · "), profile.availability]
              .filter(Boolean)
              .join(" — ")}
          </Row>
        )}
      </dl>

      {profile.blurb && (
        <p
          className={`max-w-[46em] border-s-2 border-brass ps-3 text-[15px] italic ${
            compact ? "line-clamp-2" : ""
          }`}
        >
          {profile.blurb}
        </p>
      )}
    </div>
  );
}
