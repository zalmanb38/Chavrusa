"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { SITE_URL } from "@/lib/site";

/**
 * Hands the site to the device's own share sheet, and falls back to the
 * clipboard where there isn't one (which is most desktop browsers).
 *
 * The confirmation is inline rather than a toast, per the design system's
 * "no toasts", and it is not clay: clay is the alert colour and this is
 * not an alert.
 *
 * Shares the canonical origin rather than `window.location.href`, so a
 * link forwarded from `/he` or with tracking parameters attached still
 * arrives as the site's front door.
 */
export default function ShareButton({ className }: { className?: string }) {
  const t = useTranslations("Share");
  // The site's own name, already approved and already translated — the
  // share sheet needs a title and this is it, so it is not new copy.
  const common = useTranslations("Common");
  const [state, setState] = useState<"idle" | "copied" | "manual">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function flash(next: "copied" | "manual") {
    setState(next);
    if (timer.current) clearTimeout(timer.current);
    // Long enough to read, short enough that it doesn't linger as furniture.
    timer.current = setTimeout(() => setState("idle"), 4000);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(SITE_URL);
      flash("copied");
    } catch {
      // Insecure context, or permission refused. Showing the address is
      // more use than an apology — it can still be copied by hand.
      flash("manual");
    }
  }

  async function handleClick() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: common("appName"), url: SITE_URL });
        return;
      } catch (err) {
        // Dismissing the sheet is a decision, not a failure.
        if (err instanceof DOMException && err.name === "AbortError") return;
        // Anything else (no user gesture, unsupported payload) still has
        // the clipboard behind it.
      }
    }
    await copy();
  }

  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-2 ${className ?? ""}`}>
      <button
        type="button"
        onClick={handleClick}
        className="flex items-center gap-2 text-[15px] text-ivory/90 underline-offset-4 hover:text-ivory hover:underline"
      >
        <ShareIcon />
        {t("shareLabel")}
      </button>

      {/* Announced when it appears, and reserves no space when it hasn't. */}
      <p role="status" aria-live="polite" className="text-[13.5px] text-ivory/70">
        {state === "copied" && t("copied")}
        {state === "manual" && <span dir="ltr">{SITE_URL}</span>}
      </p>
    </div>
  );
}

/** Line-art to match the mark: same stroke weight, currentColor. */
function ShareIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="size-[18px]"
      aria-hidden="true"
    >
      <circle cx="18" cy="5" r="2.6" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="6" cy="12" r="2.6" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="18" cy="19" r="2.6" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M8.4 13.3 15.6 17.7M15.6 6.3 8.4 10.7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
