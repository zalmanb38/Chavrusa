"use client";

import { useEffect, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { ProfileDetailFields } from "@/components/ProfileDetails";
import ProfileHandle from "@/components/ProfileHandle";
import PhotoPlaceholder from "@/components/PhotoPlaceholder";
import {
  ageRangeLabel,
  frequencyMessageKey,
  levelMessageKey,
  preferenceListKey,
  timeOfDayMessageKey,
  type Frequency,
  type LanguageCode,
  type Preference,
  type TimeOfDay,
} from "@/lib/profile-options";
import { topicLabels } from "@/lib/topic-names";
import { formatLocation } from "@/lib/locations";
import { visibleAgeRange } from "@/lib/browse-filters";

/**
 * The fuller view of one person, over the page rather than in it.
 *
 * Browse rows are read by the dozen, so they carry only what a row is
 * chosen on. Everything else about somebody — level, age, languages,
 * when they are free, what they wrote about themselves — is one click
 * away here, where it is read one person at a time and no longer has to
 * fit in a column beside four other people's.
 *
 * A dialog rather than a page: a row is a place in a list, and following
 * a link out of it and back loses that place. Nothing here is fetched —
 * it is the same row the card was drawn from, so opening it is instant
 * and shows exactly what the card was allowed to show.
 */
export default function ProfileDialog({
  profile,
  name,
  photoUrl = null,
  labelledById,
  matchedNote = false,
  children,
  onClose,
}: {
  profile: ProfileDetailFields & { username?: string | null };
  /** Already resolved by the card: the real name, or the stand-in. */
  name: string;
  photoUrl?: string | null;
  labelledById: string;
  /** True where the card says they already have a chavrusa. */
  matchedNote?: boolean;
  /** The action rail, repeated at the foot of the dialog. */
  children?: React.ReactNode;
  onClose: () => void;
}) {
  const t = useTranslations("Browse");
  const tProfile = useTranslations("Profile");
  const tLanguages = useTranslations("Languages");
  const tLocation = useTranslations("Location");
  const tSuggested = useTranslations("Suggested");
  const locale = useLocale();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  // The page behind a dialog shouldn't scroll while it is up.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  // role="dialog" only labels the markup; focus has to be moved by hand,
  // and handed back on close so a keyboard reader returns to the row
  // they opened rather than to the top of the document.
  useEffect(() => {
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();
    return () => {
      previouslyFocusedRef.current?.focus();
    };
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      // Tab stays inside the panel, so cycling never lands on the page
      // sitting behind the overlay.
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        "a[href], button:not([disabled])",
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  // "Label — the only chrome voice": small, wide tracking, uppercase.
  const labelClass = "text-[11px] tracking-[0.14em] text-muted uppercase";
  // Reused rather than a new string: the profile form already calls an
  // unanswered question this, in all four languages.
  const unanswered = tProfile("levelUnset");

  const topics = topicLabels(profile.topics, profile.topic_other, locale);
  const place = formatLocation(profile, (code) => tLocation(`country_${code}`));
  const storedAge = visibleAgeRange(profile);

  const languageList = (codes: readonly string[] | null | undefined) =>
    (codes ?? []).map((code) => tLanguages(code as LanguageCode)).join(", ");

  const when = [
    profile.frequency &&
      tProfile(frequencyMessageKey[profile.frequency as Frequency]),
    profile.time_of_day &&
      tProfile(timeOfDayMessageKey[profile.time_of_day as TimeOfDay]),
    profile.session_length &&
      tProfile("sessionLengthValue", { minutes: Number(profile.session_length) }),
  ]
    .filter(Boolean)
    .join(" · ");

  // Order follows the questions people ask each other: what level, how
  // old, what you'd speak, what the text is in, how you'd meet, when,
  // and anything they added themselves.
  const rows: { label: string; value: string }[] = [
    {
      label: tProfile("learningLevel"),
      value: profile.level ? tProfile(levelMessageKey[profile.level]) : "",
    },
    {
      label: tProfile("ageRange"),
      value: storedAge ? ageRangeLabel(storedAge, tProfile) : "",
    },
    {
      label: tProfile("languagesShort"),
      value: languageList(profile.languages),
    },
    {
      label: tProfile("studyLanguages"),
      value: languageList(profile.study_languages),
    },
    {
      label: tProfile("learningPreference"),
      value: tProfile(preferenceListKey[profile.preference as Preference]),
    },
    { label: tSuggested("dimWhen"), value: when },
    {
      label: tProfile("availability"),
      value: profile.availability?.trim() ?? "",
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#1b2430]/60 p-3 sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledById}
        className="relative my-auto flex w-full max-w-[680px] flex-col gap-5 border border-border bg-background p-5 sm:p-7"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label={t("closeDetails")}
          className="absolute end-3 top-3 flex size-7 items-center justify-center text-muted hover:text-foreground"
        >
          <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden
            className="size-4"
          >
            <path d="M3 3l10 10M13 3L3 13" />
          </svg>
        </button>

        <div className="flex items-start gap-4 pe-8">
          {photoUrl ? (
            /* Signed Supabase URLs are short-lived and host-specific, so
               they don't fit next/image's remotePatterns model. */
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl}
              alt=""
              className="size-20 shrink-0 rounded-2xl object-cover"
            />
          ) : (
            <PhotoPlaceholder className="size-20 shrink-0" />
          )}

          <div className="flex min-w-0 flex-col gap-1">
            <h2
              id={labelledById}
              className="text-[27px] leading-tight font-semibold"
            >
              {name}
            </h2>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-[13.5px] text-muted">
              <ProfileHandle
                username={profile.username ?? null}
                className="text-[13.5px]"
              />
              <span>{place}</span>
              {matchedNote && <span>{t("alreadyLearning")}</span>}
            </div>
          </div>
        </div>

        {/* Subjects first and across the full width — they are what
            somebody opened this to check — with both names, which the
            card no longer has room for. */}
        <div className="flex flex-col gap-1.5 border-t border-border pt-4">
          <span className={labelClass}>{tProfile("topicsShort")}</span>
          {topics.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {topics.map((topic) => (
                <span
                  key={topic}
                  className="bg-slate-100 px-2 py-0.5 text-[14px] leading-snug text-slate-700"
                >
                  {topic}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-[15px] text-neutral-400">{unanswered}</span>
          )}
        </div>

        {/*
          Every answer, labelled, including the ones they left blank.
          A field shown as "Not specified" says something a missing row
          cannot: that it was asked and not answered, which is worth
          knowing before writing to somebody.
        */}
        <dl className="grid gap-x-8 gap-y-4 border-t border-border pt-4 sm:grid-cols-2">
          {rows.map(({ label, value }) => (
            <div key={label} className="flex flex-col gap-0.5">
              <dt className={labelClass}>{label}</dt>
              <dd
                className={`text-[15px] leading-snug ${
                  value ? "text-foreground" : "text-neutral-400"
                }`}
              >
                {value || unanswered}
              </dd>
            </div>
          ))}
        </dl>

        <div className="flex flex-col gap-1.5 border-t border-border pt-4">
          <span className={labelClass}>{tProfile("blurb")}</span>
          {profile.blurb?.trim() ? (
            <p className="border-s-2 border-brass ps-3 text-[15px] leading-relaxed text-muted italic">
              {profile.blurb}
            </p>
          ) : (
            <span className="text-[15px] text-neutral-400">{unanswered}</span>
          )}
        </div>

        {children && (
          <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
