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
import PhotoPlaceholder from "@/components/PhotoPlaceholder";

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
  rank,
  topic,
  currentUserId,
  connectStatus,
  requestId,
  retryAfter,
  photoUrl = null,
}: {
  suggestion: Suggestion;
  /** Position inside its subject section, counted from 1. */
  rank: number;
  /** The section's subject, so the strip can lead with it. */
  topic: string;
  currentUserId: string;
  connectStatus: ConnectStatus;
  requestId: string | null;
  retryAfter: string | null;
  /** Signed URL, only where this person made their photo public. */
  photoUrl?: string | null;
}) {
  const t = useTranslations("Browse");
  const { profile } = suggestion;

  return (
    <li className="grid gap-x-6 gap-y-4 border-t border-border py-6 transition-colors hover:bg-surface lg:grid-cols-[2.5rem_1fr_200px]">
      {/* The gold numeral: "gold — rules, numerals, ornament". It gives
          each row a visible start, which is what keeps four of them from
          reading as one block of text. */}
      <p
        className="hidden text-[26px] leading-none font-semibold text-brass lg:block"
        aria-hidden
      >
        {rank}
      </p>

      <div className="flex items-start gap-4">
        {photoUrl ? (
          /* Signed Supabase URLs are short-lived and host-specific, so
             they don't fit next/image's remotePatterns model. */
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt=""
            className="size-14 shrink-0 rounded-2xl object-cover"
          />
        ) : (
          <PhotoPlaceholder className="size-14 shrink-0" />
        )}

      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
          <h3 className="text-[23px] leading-tight font-semibold">
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

        <FitStrip cells={suggestion.cells} leadTopic={topic} />

        {profile.blurb && (
          <p className="max-w-[46em] border-s-2 border-brass ps-3 text-[14.5px] text-muted italic">
            {profile.blurb}
          </p>
        )}
      </div>
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
