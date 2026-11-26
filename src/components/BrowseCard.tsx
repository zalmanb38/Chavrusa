"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import type { Profile } from "@/lib/profile-options";
import type { ConnectStatus } from "@/lib/connect";
import ProfileDetails, { ProfileLocation } from "@/components/ProfileDetails";
import ConnectButton from "@/components/ConnectButton";
import ProfileHandle from "@/components/ProfileHandle";
import ReportButton from "@/components/ReportButton";
import BlockButton from "@/components/BlockButton";
import PhotoPlaceholder from "@/components/PhotoPlaceholder";
import ProfileDialog from "@/components/ProfileDialog";

/**
 * One learner, as shown in Browse.
 *
 * Shared by the list and the map so the two can't drift apart as either
 * one is edited. Two props are the difference between them: `showName`,
 * because a map cluster deliberately doesn't attach names to a place, and
 * `showMatchedNote`, because the list says it with a section heading and
 * a map has no bottom to put one at.
 *
 * The photo slot is always drawn, with or without a photo in it. Most
 * people's will be private — the default — and a row that only grows a
 * thumbnail for the few who chose otherwise would read as a ranking of
 * the list rather than a fact about each person.
 */
export default function BrowseCard({
  profile,
  currentUserId,
  connectStatus,
  requestId,
  retryAfter,
  photoUrl = null,
  showName,
  showMatchedNote = false,
}: {
  profile: Profile;
  currentUserId: string;
  connectStatus: ConnectStatus;
  requestId: string | null;
  retryAfter: string | null;
  /**
   * A signed URL, present only where the person made their photo public
   * and it has been approved. Null is the ordinary case, not an error.
   */
  photoUrl?: string | null;
  showName: boolean;
  showMatchedNote?: boolean;
}) {
  const t = useTranslations("Browse");
  const [detailsOpen, setDetailsOpen] = useState(false);
  // One source of truth for the two Connect buttons — the row's and the
  // dialog's. Without it, connecting from the dialog would leave the row
  // behind it still offering to connect.
  const [status, setStatus] = useState(connectStatus);
  const headingId = useId();

  const displayName = showName ? profile.name : t("anonymousLearner");

  const connect = (
    <ConnectButton
      key={status}
      currentUserId={currentUserId}
      recipientId={profile.id}
      initialStatus={status}
      requestId={requestId}
      retryAfter={retryAfter}
      onStatusChange={setStatus}
    />
  );

  return (
    // A hairline row, not a card: "no boxes for layout — sections are
    // separated by whitespace and, where a boundary is needed, a single
    // 1px rule." The hover tint is the row's own, per the design.
    <li className="grid gap-6 border-t border-border py-4 transition-colors hover:bg-surface lg:grid-cols-[1fr_200px]">
      {/* Photo and words side by side, the words free to wrap in their
          own column: a long name and a column of tags should not drag
          the face away from the line it belongs to. */}
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

      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
          {/* The name is the way in: a person reading a row is already
              looking at it, so the fuller view opens from the thing they
              are looking at rather than from a control somewhere else.
              "More info" below says so for anyone who wouldn't guess. */}
          <h2 className="text-[21px] leading-tight font-semibold">
            <button
              type="button"
              onClick={() => setDetailsOpen(true)}
              className="text-start hover:text-brass hover:underline underline-offset-4"
            >
              {displayName}
            </button>
          </h2>
          {/* The handle rides in the same baseline row as the name rather
              than on a line of its own: this is a hairline row, and a
              second line of text for three optional words would weigh
              more than it says. Hidden with the name on the map, where
              identifying someone by their place is the whole point of
              not naming them. */}
          {showName && <ProfileHandle username={profile.username} className="text-[13.5px]" />}
          {/* Meta voice: smaller, quieter, and clearly not part of the
              name it sits beside. */}
          <span className="text-[13.5px] text-muted">
            <ProfileLocation profile={profile} />
          </span>
          {/*
            Somebody learning with one chavrusa may still be looking for
            another, so this says what is true rather than closing the
            card: they are here because they are still looking, and the
            person reading deserves to know they are not the first.

            Meta voice like the location beside it, and no box — a badge
            would read as a status the card is about.
          */}
          {showMatchedNote && profile.match_count > 0 && (
            <span className="text-[13.5px] text-muted">
              {t("alreadyLearning")}
            </span>
          )}
        </div>

        <ProfileDetails profile={profile} compact />

        {/* Everything the row no longer carries — level, age, languages,
            when they are free — is behind this, so the decision to reach
            out can be made without leaving the list. */}
        <button
          type="button"
          onClick={() => setDetailsOpen(true)}
          className="w-fit text-[13.5px] text-slate-600 underline underline-offset-2 hover:text-brass"
        >
          {t("moreInfo")}
        </button>
      </div>
      </div>

      {/* Right rail, opened by a hairline on the inline-start edge so it
          mirrors correctly in Hebrew. */}
      <div className="flex flex-col items-start gap-3 lg:border-s lg:border-border lg:ps-6">
        {connect}

        <div className="flex gap-3">
          <ReportButton currentUserId={currentUserId} reportedId={profile.id} />
          <BlockButton
            currentUserId={currentUserId}
            blockedId={profile.id}
            blockedName={displayName}
          />
        </div>
      </div>

      {detailsOpen && (
        <ProfileDialog
          profile={showName ? profile : { ...profile, username: null }}
          name={displayName}
          photoUrl={photoUrl}
          labelledById={headingId}
          matchedNote={showMatchedNote && profile.match_count > 0}
          onClose={() => setDetailsOpen(false)}
        >
          {connect}
        </ProfileDialog>
      )}
    </li>
  );
}
