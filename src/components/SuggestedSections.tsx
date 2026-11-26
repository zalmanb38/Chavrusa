"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { topicName } from "@/lib/topic-names";
import type { ConnectInfo } from "@/lib/connect";
import type { SuggestionGroup } from "@/lib/suggestions";
import SuggestedCard from "@/components/SuggestedCard";

/**
 * The suggested view of Browse: one section per subject the viewer
 * learns, strongest fit first inside each.
 *
 * Subjects are the organising idea rather than a filter, because that is
 * the question a person actually arrives with — not "who is a good fit?"
 * but "who can I learn Gemara with?". Each heading is a gold rule with
 * the subject in both its names, the count beside it, and a link out to
 * everyone else learning it, so a section is a doorway into Browse rather
 * than a dead end.
 */
export default function SuggestedSections({
  groups,
  heldBack,
  currentUserId,
  connectStatuses,
  photoUrls,
}: {
  groups: SuggestionGroup[];
  heldBack: number;
  currentUserId: string;
  connectStatuses: Record<string, ConnectInfo>;
  /** Signed photo URLs by owner id, for the people who made theirs public. */
  photoUrls: Record<string, string>;
}) {
  const t = useTranslations("Suggested");
  const locale = useLocale();

  return (
    <div className="flex flex-col gap-10">
      {groups.map((group) => {
        // Both names here, unlike the rows below: a heading is read once
        // on the way past, where the pair is an ornament rather than
        // repetition, and Zalman prefers it (25 Nov 2026).
        const subject = topicName(group.topic, locale);
        return (
          <section key={group.topic} className="flex flex-col">
            {/* Subject heading on a gold rule — the design's one ornament,
                used here because a section break has to be readable at a
                glance while scrolling past four of them. */}
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-t-2 border-brass bg-surface px-3 pt-2.5 pb-2.5">
              <h2 className="text-[27px] leading-tight font-semibold">
                {subject}
              </h2>
              <div className="flex items-baseline gap-4">
                <span className="text-[13px] text-muted">
                  {t("sectionCount", { count: group.total })}
                </span>
                <Link
                  href={{ pathname: "/browse", query: { topic: group.topic } }}
                  className="text-[13px] text-slate-600 underline hover:text-brass"
                >
                  {t("seeAll", { subject })}
                </Link>
              </div>
            </div>

            <ul className="flex flex-col">
              {group.suggestions.map((suggestion, index) => (
                <SuggestedCard
                  key={suggestion.profile.id}
                  suggestion={suggestion}
                  rank={index + 1}
                  topic={group.topic}
                  currentUserId={currentUserId}
                  connectStatus={
                    connectStatuses[suggestion.profile.id]?.status ?? "none"
                  }
                  requestId={
                    connectStatuses[suggestion.profile.id]?.requestId ?? null
                  }
                  retryAfter={
                    connectStatuses[suggestion.profile.id]?.retryAfter ?? null
                  }
                  photoUrl={photoUrls[suggestion.profile.id] ?? null}
                />
              ))}
            </ul>
          </section>
        );
      })}

      {heldBack > 0 && (
        <p className="text-[13px] text-muted">
          {t("heldBack", { count: heldBack })}
        </p>
      )}

    </div>
  );
}
