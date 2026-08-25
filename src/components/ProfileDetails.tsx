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

/**
 * One labelled row. The label is the design system's "only chrome voice":
 * 11.5px, wide tracking, uppercase, in neutral-700.
 */
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="pt-0.5 text-[11.5px] tracking-[0.14em] text-muted uppercase">
        {label}
      </dt>
      <dd className="text-[15px]">{children}</dd>
    </>
  );
}

/**
 * Everything about a person that is safe to show before a match, as
 * labelled rows rather than a paragraph.
 *
 * Running these together — topics, then level, then languages, then
 * availability — made a row read as one block of prose that had to be
 * read in full to find anything. Each kind of fact now sits against its
 * own label, so a reader can look down the column they care about.
 */
export default function ProfileDetails({
  profile,
}: {
  profile: ProfileDetailFields;
}) {
  const tProfile = useTranslations("Profile");
  const tTopics = useTranslations("Topics");
  const tLanguages = useTranslations("Languages");

  const topics = topicLabels(profile.topics, profile.topic_other, tTopics);
  const age = visibleAgeRange(profile);

  // Frequency, time of day and session length describe one thing — when
  // and how often — so they read better as a single line than as three
  // rows each holding two words.
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
    <div className="flex flex-col gap-3">
      <dl className="grid gap-x-5 gap-y-2 sm:grid-cols-[8.5rem_1fr]">
        {topics.length > 0 && (
          <Row label={tProfile("topicsOfInterest")}>{topics.join(" · ")}</Row>
        )}

        {profile.level && (
          <Row label={tProfile("learningLevel")}>
            {tProfile(levelMessageKey[profile.level])}
          </Row>
        )}

        <Row label={tProfile("learningPreference")}>
          {tProfile(preferenceMessageKey[profile.preference as Preference])}
        </Row>

        {age && <Row label={tProfile("ageRange")}>{age}</Row>}

        {profile.languages?.length > 0 && (
          <Row label={tProfile("languagesSpoken")}>
            {profile.languages.map((l: LanguageCode) => tLanguages(l)).join(" · ")}
          </Row>
        )}

        {profile.study_languages?.length > 0 && (
          <Row label={tProfile("studyLanguages")}>
            {profile.study_languages.map((l) => tLanguages(l)).join(" · ")}
          </Row>
        )}

        {(rhythm.length > 0 || profile.availability) && (
          <Row label={tProfile("availability")}>
            <span className="flex flex-col gap-0.5">
              {rhythm.length > 0 && <span>{rhythm.join(" · ")}</span>}
              {profile.availability && (
                <span className="text-muted">{profile.availability}</span>
              )}
            </span>
          </Row>
        )}
      </dl>

      {profile.blurb && (
        <p className="max-w-[40em] border-s-2 border-brass ps-3 text-[15px] italic">
          {profile.blurb}
        </p>
      )}
    </div>
  );
}
