"use client";

import { useTranslations } from "next-intl";
import type { Profile } from "@/lib/profile-options";
import type { ConnectStatus } from "@/lib/connect";
import ProfileDetails, { ProfileLocation } from "@/components/ProfileDetails";
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

  return (
    <li className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-serif text-lg font-medium">
          {showName ? profile.name : t("anonymousLearner")}
        </h2>
        <ProfileLocation profile={profile} />
      </div>

      <ProfileDetails profile={profile} />

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
