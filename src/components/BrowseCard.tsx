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
    // A hairline row, not a card: "no boxes for layout — sections are
    // separated by whitespace and, where a boundary is needed, a single
    // 1px rule." The hover tint is the row's own, per the design.
    <li className="grid gap-9 border-t border-border py-6 transition-colors hover:bg-surface sm:grid-cols-[1fr_210px]">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="text-[26px] font-semibold">
            {showName ? profile.name : t("anonymousLearner")}
          </h2>
          <ProfileLocation profile={profile} />
        </div>

        <ProfileDetails profile={profile} />
      </div>

      {/* Right rail, opened by a hairline on the inline-start edge so it
          mirrors correctly in Hebrew. */}
      <div className="flex flex-col items-start gap-3 sm:border-s sm:border-border sm:ps-6">
        <ConnectButton
          currentUserId={currentUserId}
          recipientId={profile.id}
          initialStatus={connectStatus}
          requestId={requestId}
        />

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
