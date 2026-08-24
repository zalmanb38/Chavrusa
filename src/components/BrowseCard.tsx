"use client";

import { useTranslations } from "next-intl";
import {
  topicLabels,
  preferenceMessageKey,
  levelMessageKey,
  frequencyMessageKey,
  timeOfDayMessageKey,
  type Frequency,
  type TimeOfDay,
  type Profile,
  type LanguageCode,
  type Preference,
} from "@/lib/profile-options";
import { formatLocation } from "@/lib/locations";
import { visibleAgeRange } from "@/lib/browse-filters";
import type { ConnectStatus } from "@/lib/connect";
import ConnectButton from "@/components/ConnectButton";
import ReportButton from "@/components/ReportButton";
import BlockButton from "@/components/BlockButton";

/**
 * One learner, as shown in Browse.
 *
 * Shared by the list and the map so the two can't drift apart as either
 * one is edited. `showName` is the only difference between them: a map
 * cluster deliberately doesn't attach names to a place.
 */
export default function BrowseCard({
  profile,
  currentUserId,
  connectStatus,
  requestId,
  showName,
}: {
  profile: Profile;
  currentUserId: string;
  connectStatus: ConnectStatus;
  requestId: string | null;
  showName: boolean;
}) {
  const t = useTranslations("Browse");
  const tProfile = useTranslations("Profile");
  const tTopics = useTranslations("Topics");
  const tLanguages = useTranslations("Languages");
  const tLocation = useTranslations("Location");

  const location = formatLocation(profile, (code) =>
    tLocation(`country_${code}`),
  );
  const topics = topicLabels(profile.topics, profile.topic_other, tTopics);

  return (
    <li className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-serif text-lg font-medium">
          {showName ? profile.name : t("anonymousLearner")}
        </h2>
        {location && <span className="text-sm text-muted">{location}</span>}
      </div>

      {topics.length > 0 && <p className="text-sm">{topics.join(", ")}</p>}

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        {profile.languages?.length > 0 && (
          <span>
            {profile.languages.map((l: LanguageCode) => tLanguages(l)).join(", ")}
          </span>
        )}
        <span>
          {tProfile(preferenceMessageKey[profile.preference as Preference])}
        </span>
        {profile.level && <span>{tProfile(levelMessageKey[profile.level])}</span>}
        {visibleAgeRange(profile) && <span>{visibleAgeRange(profile)}</span>}
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

      <ConnectButton
        currentUserId={currentUserId}
        recipientId={profile.id}
        initialStatus={connectStatus}
        requestId={requestId}
      />

      <div className="flex flex-col items-start gap-2 pt-1">
        <div className="flex gap-3">
          <ReportButton currentUserId={currentUserId} reportedId={profile.id} />
          <BlockButton
            currentUserId={currentUserId}
            blockedId={profile.id}
            blockedName={showName ? profile.name : t("anonymousLearner")}
          />
        </div>
      </div>
    </li>
  );
}
