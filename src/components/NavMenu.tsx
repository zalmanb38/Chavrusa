"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "@/i18n/navigation";

/**
 * The narrow-screen disclosure around the nav links.
 *
 * It stays a <details> — the browser already knows how to open and close
 * one, and it still works before hydration. The only thing the browser
 * won't do on its own is close it again once you've picked a link, so that
 * part, and that part alone, is what this client component adds.
 */
export default function NavMenu({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();

  // Navigating away closes it. Harmless on first render, where it's shut
  // already.
  useEffect(() => {
    if (ref.current) ref.current.open = false;
  }, [pathname]);

  useEffect(() => {
    function close() {
      if (ref.current?.open) ref.current.open = false;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;
      if (target instanceof Node && ref.current?.contains(target)) return;
      close();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  /**
   * Tapping a link to the page you're already on doesn't change the
   * pathname, so the effect above never fires — the click itself has to
   * close the menu.
   *
   * Links and buttons only: the language picker is a <select>, and pulling
   * the menu out from under it the moment it opens would make the thing
   * unusable.
   */
  function handleClick(event: React.MouseEvent<HTMLDivElement>) {
    const target = event.target;
    if (target instanceof Element && target.closest("a, button")) {
      if (ref.current) ref.current.open = false;
    }
  }

  return (
    // Once open, from sm up, the <details> itself becomes the row: the
    // links sit in normal flow beside the button rather than hanging off
    // it. Laying them out instead of positioning them is what stops the
    // long languages from running over the wordmark — flexbox shares the
    // bar out, and the row wraps inside it when there isn't enough.
    // flex-row-reverse puts the button last in reading order and first in
    // Hebrew, which is where it already sat.
    <details
      ref={ref}
      className="group sm:open:flex sm:open:flex-row-reverse sm:open:items-center sm:open:gap-4 xl:hidden"
    >
      <summary className="flex h-10 shrink-0 cursor-pointer list-none items-center gap-2 border border-border px-3 text-[15px]">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          className="size-5"
          aria-hidden="true"
        >
          <g className="group-open:hidden">
            <path d="M4 7h16" />
            <path d="M4 12h16" />
            <path d="M4 17h16" />
          </g>
          <g className="hidden group-open:block">
            <path d="M6 6l12 12" />
            <path d="M18 6L6 18" />
          </g>
        </svg>
        {label}
      </summary>

      {/*
        Two placements, one element. On a phone there is no room beside
        the wordmark, so it stays a panel across the full width, hung
        under the bar. From sm up it is just a wrapping row inside the
        bar, and the <details> above does the placing.
      */}
      <div
        onClick={handleClick}
        className="absolute inset-x-0 top-full z-20 flex flex-wrap items-center gap-2 border-b border-border bg-background px-6 py-4 sm:static sm:justify-end sm:border-0 sm:p-0"
      >
        {children}
      </div>
    </details>
  );
}
