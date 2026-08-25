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
import { formatLocation } from "@/lib/locations";
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
  const tLocation = useTranslations("Location");
  const location = formatLocation(profile, (code) =>
    tLocation(`country_${code}`),
  );
  return location ? <span className="text-sm text-muted">{location}</span> : null;
}

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

  return (
    <div className="flex flex-col gap-2">
      {topics.length > 0 && <p className="text-sm">{topics.join(", ")}</p>}

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        {profile.languages?.length > 0 && (
          <span>
            {profile.languages
              .map((l: LanguageCode) => tLanguages(l))
              .join(", ")}
          </span>
        )}
        <span>
          {tProfile(preferenceMessageKey[profile.preference as Preference])}
        </span>
        {profile.level && (
          <span>{tProfile(levelMessageKey[profile.level])}</span>
        )}
        {age && <span>{age}</span>}
        {profile.frequency && (
          <span>
            {tProfile(frequencyMessageKey[profile.frequency as Frequency])}
          </span>
        )}
        {profile.time_of_day && (
          <span>
            {tProfile(timeOfDayMessageKey[profile.time_of_day as TimeOfDay])}
          </span>
        )}
        {profile.session_length && (
          <span>
            {tProfile("sessionLengthValue", {
              minutes: Number(profile.session_length),
            })}
          </span>
        )}
      </div>

      {profile.study_languages?.length > 0 && (
        <p className="text-xs text-muted">
          {tProfile("studyLanguagesShort", {
            languages: profile.study_languages
              .map((l) => tLanguages(l))
              .join(", "),
          })}
        </p>
      )}

      {profile.availability && (
        <p className="text-xs text-muted">{profile.availability}</p>
      )}

      {profile.blurb && (
        <p className="rounded-xl bg-background/60 p-3 text-sm italic">
          {profile.blurb}
        </p>
      )}
    </div>
  );
}
