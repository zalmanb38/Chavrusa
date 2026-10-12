"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import ShareButton from "@/components/ShareButton";

const DISMISSED_KEY = "chavrusa:launchProgressDismissed";

type LaunchProgressModalProps = {
  goal: number;
  count: number;
  remaining: number;
  percent: number;
};

/**
 * The soft-launch progress popup.
 *
 * A blocking modal rather than a page section: the earlier inline-card
 * versions always left either leftover copy with nowhere compact to go,
 * or dead space beside a narrow card on a wide screen. A popup sidesteps
 * both — it borrows no permanent real estate from the page at all.
 *
 * Shows once per visitor. A dismissal is remembered in localStorage so
 * returning visitors aren't asked again; a visitor who never dismisses it
 * sees it again on their next visit, which is the point.
 */
export default function LaunchProgressModal({
  goal,
  count,
  remaining,
  percent,
}: LaunchProgressModalProps) {
  const t = useTranslations("Launch");
  const [open, setOpen] = useState(false);

  // Decide visibility after mount: localStorage isn't available during
  // server rendering, and reading it is what makes the "remember" promise
  // real rather than cosmetic.
  useEffect(() => {
    let cancelled = false;
    // Deferred by a microtask rather than set straight from the effect
    // body: react-hooks/set-state-in-effect rejects the synchronous form,
    // and it is a hard error here, not a warning. The read itself is
    // unchanged and still happens on mount.
    const show = () => {
      if (!cancelled) setOpen(true);
    };

    try {
      if (window.localStorage.getItem(DISMISSED_KEY) !== "1") {
        queueMicrotask(show);
      }
    } catch {
      // Storage blocked (private browsing, locked-down cookies) — fail
      // open. Showing the popup once more beats silently losing a launch
      // promotion to a browser setting nobody can see.
      queueMicrotask(show);
    }

    return () => {
      cancelled = true;
    };
  }, []);

  // Blocking means blocking: the page behind it shouldn't scroll while
  // it's up.
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  function dismiss() {
    setOpen(false);
    try {
      window.localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // No durable memory of this dismissal, but the modal still closes
      // for the rest of this visit.
    }
  }

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") dismiss();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1b2430]/60 p-3"
      onClick={dismiss}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="launch-progress-heading"
        className="relative flex w-full max-w-[380px] flex-col gap-2.5 rounded-2xl border border-border bg-surface p-4"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={dismiss}
          aria-label={t("dismiss")}
          className="absolute end-3 top-3 flex size-6 items-center justify-center text-muted hover:text-foreground"
        >
          <CloseIcon className="size-4" />
        </button>

        <p className="flex items-center gap-1.5 pe-6 text-[11px] font-semibold tracking-[0.09em] text-brass-deep uppercase">
          <span className="flex size-4 items-center justify-center bg-brass-tint">
            <GroupIcon className="size-[10px]" />
          </span>
          {t("eyebrow")}
        </p>

        <div>
          {/* No end-padding here: the close button sits in the eyebrow row
              above, not beside this line, so the heading gets the card's
              full width and fits on one line instead of wrapping under a
              reserved gutter it doesn't actually need. */}
          <h2
            id="launch-progress-heading"
            className="text-[18px] leading-[1.25] font-semibold"
          >
            {t("heading")}
          </h2>
          <div className="mt-1.5 flex flex-col gap-1 text-[12.5px] leading-snug">
            <p className="text-muted">{t("body1")}</p>
            <p className="font-semibold">{t("body2")}</p>
            <p className="text-muted">{t("body3")}</p>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="flex items-center gap-1 text-[12px]">
              <MemberIcon className="size-[12px] text-brass-deep" />
              {t("joinedCount", { count })}
            </span>
            {/* Not a translated string: the same number in every language. */}
            <span className="text-[17px] leading-none font-bold text-brass-deep">
              {percent}%
            </span>
          </div>

          <div
            className="h-1.5 w-full bg-background"
            role="progressbar"
            aria-valuenow={count}
            aria-valuemin={0}
            aria-valuemax={goal}
            aria-label={t("goalLine")}
          >
            {/* Floored at a sliver so the bar reads as a bar from the
                first member rather than as an empty track. */}
            <div
              className="h-full bg-brass"
              style={{ width: `${Math.max(percent, 2)}%` }}
            />
          </div>

          <p className="text-[11.5px] text-muted">{t("toGo", { remaining })}</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Link
            href="/signup"
            className="bg-primary px-4 py-2 text-center text-[13.5px] font-semibold text-primary-foreground hover:bg-slate-600"
          >
            {t("joinButton")}
          </Link>
          <ShareButton
            tone="ink"
            label={t("shareButton")}
            className="justify-center text-[12.5px]"
          />
        </div>
      </div>
    </div>
  );
}

/* Line-art at ShareIcon's weight and in currentColor, so these read as
   the same hand rather than a second icon set. */

function MemberIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5 20c0-3.3 3.1-5.6 7-5.6s7 2.3 7 5.6" />
    </svg>
  );
}

/** Two overlapping people, for the "Help Us Grow" eyebrow. */
function GroupIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19c0-3.4 2.5-5.6 5.5-5.6s5.5 2.2 5.5 5.6" />
      <circle cx="17.5" cy="9" r="2.5" strokeWidth="1.6" />
      <path d="M14.8 19c0-2.6 1.6-4.4 3.9-4.4 1.9 0 3.3 1.1 3.8 2.9" strokeWidth="1.6" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
