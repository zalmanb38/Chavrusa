"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import ProfileDetails, { ProfileLocation } from "@/components/ProfileDetails";
import type { ProfileDetailFields } from "@/components/ProfileDetails";
import ProfileHandle from "@/components/ProfileHandle";
import PhotoPlaceholder from "@/components/PhotoPlaceholder";

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
  children,
  onClose,
}: {
  profile: ProfileDetailFields & { username?: string | null };
  /** Already resolved by the card: the real name, or the stand-in. */
  name: string;
  photoUrl?: string | null;
  labelledById: string;
  /** The action rail, repeated at the foot of the dialog. */
  children?: React.ReactNode;
  onClose: () => void;
}) {
  const t = useTranslations("Browse");
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
        className="relative my-auto flex w-full max-w-[560px] flex-col gap-5 border border-border bg-background p-5 sm:p-7"
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
              className="size-16 shrink-0 rounded-2xl object-cover"
            />
          ) : (
            <PhotoPlaceholder className="size-16 shrink-0" />
          )}

          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 id={labelledById} className="text-[24px] leading-tight font-semibold">
              {name}
            </h2>
            <div className="flex flex-wrap items-baseline gap-x-3 text-[13.5px] text-muted">
              <ProfileHandle
                username={
                  (profile as { username?: string | null }).username ?? null
                }
                className="text-[13.5px]"
              />
              <ProfileLocation profile={profile} />
            </div>
          </div>
        </div>

        {/* The full block, both names on every subject: here there is one
            person on the screen and room to read them. */}
        <div className="border-t border-border pt-4">
          <ProfileDetails profile={profile} />
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
