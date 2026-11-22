"use client";

import { useTranslations } from "next-intl";
import type { ConnectStatus } from "@/lib/connect";
import type { Suggestion } from "@/lib/suggestions";
import { ProfileLocation } from "@/components/ProfileDetails";
import ConnectButton from "@/components/ConnectButton";
import ProfileHandle from "@/components/ProfileHandle";
import ReportButton from "@/components/ReportButton";
import BlockButton from "@/components/BlockButton";
import FitStrip from "@/components/FitStrip";

/**
 * One suggested chavrusa.
 *
 * The same hairline row as Browse — same name line, same right rail, so
 * the two lists are visibly the same site — with the fit table where
 * Browse puts its tags. The tags are dropped on purpose: a suggestion's
 * job is to say what the two have in common, and repeating every subject
 * this person lists underneath that would bury it.
 */
export default function SuggestedCard({
  suggestion,
  currentUserId,
  connectStatus,
  requestId,
  retryAfter,
}: {
  suggestion: Suggestion;
  currentUserId: string;
  connectStatus: ConnectStatus;
  requestId: string | null;
  retryAfter: string | null;
}) {
  const t = useTranslations("Browse");
  const { profile } = suggestion;

  return (
    <li className="grid gap-6 border-t border-border py-5 transition-colors hover:bg-surface lg:grid-cols-[1fr_200px]">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
          <h3 className="text-[21px] leading-tight font-semibold">
            {profile.name}
          </h3>
          <ProfileHandle username={profile.username} className="text-[13.5px]" />
          <span className="text-[13.5px] text-muted">
            <ProfileLocation profile={profile} />
          </span>
          {profile.match_count > 0 && (
            <span className="text-[13.5px] text-muted">
              {t("alreadyLearning")}
            </span>
          )}
        </div>

        <FitStrip cells={suggestion.cells} tier={suggestion.tier} />

        {profile.blurb && (
          <p className="max-w-[46em] border-s-2 border-brass ps-3 text-[14.5px] text-muted italic">
            {profile.blurb}
          </p>
        )}
      </div>

      <div className="flex flex-col items-start gap-3 lg:border-s lg:border-border lg:ps-6">
        <ConnectButton
          currentUserId={currentUserId}
          recipientId={profile.id}
          initialStatus={connectStatus}
          requestId={requestId}
          retryAfter={retryAfter}
        />
        <div className="flex gap-3">
          <ReportButton currentUserId={currentUserId} reportedId={profile.id} />
          <BlockButton
            currentUserId={currentUserId}
            blockedId={profile.id}
            blockedName={profile.name}
          />
        </div>
      </div>
    </li>
  );
}
