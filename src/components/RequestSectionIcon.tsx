/**
 * The four Requests sections, drawn in the open-book mark's language:
 * 24px box, strokes only, round joins, `currentColor` so each icon takes
 * the colour of the heading it sits beside.
 *
 * They are not generic inbox/outbox glyphs. Three of the four are books,
 * because that is what the page is about — a sefer arriving, a sefer
 * sent, and two facing each other once there is a chavrusa. Only
 * "blocked" steps outside, which is the point of it.
 *
 * Always aria-hidden: each one sits next to a heading that already says
 * what it is, so announcing it again is noise to a screen reader.
 */
export default function RequestSectionIcon({
  kind,
  className,
}: {
  kind: "incoming" | "outgoing" | "matched" | "blocked";
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      stroke="currentColor"
    >
      {/* The two request icons are the same book with the arrow reversed.
          The arrows are horizontal, not diagonal: at 22px a diagonal
          reads as a tick in both directions and the pair became
          indistinguishable, which is the one thing they must not be. */}
      {kind === "incoming" && (
        <>
          <path d="M9 6.8c-1.5-.9-3.2-1.3-5.2-1.1v12.6c2-.2 3.7.2 5.2 1.1" />
          <path d="M9 6.8v12.6" />
          <path d="M21 12h-7.5" />
          <path d="M16.5 8.6 13 12l3.5 3.4" />
        </>
      )}

      {kind === "outgoing" && (
        <>
          <path d="M9 6.8c-1.5-.9-3.2-1.3-5.2-1.1v12.6c2-.2 3.7.2 5.2 1.1" />
          <path d="M9 6.8v12.6" />
          <path d="M13.5 12H21" />
          <path d="M17.5 8.6 21 12l-3.5 3.4" />
        </>
      )}

      {kind === "matched" && (
        <>
          {/* Two facing pages — the open book itself, the whole point of
              the page, so it gets the mark rather than a variation. */}
          <path d="M12 7c-2.3-1.7-5.1-2.3-8.5-1.9v12.8c3.4-.4 6.2.2 8.5 1.9" />
          <path d="M12 7c2.3-1.7 5.1-2.3 8.5-1.9v12.8c-3.4-.4-6.2.2-8.5 1.9" />
          <path d="M12 7v12.8" />
        </>
      )}

      {kind === "blocked" && (
        <>
          <circle cx="12" cy="12" r="8" />
          <path d="M6.4 6.4 17.6 17.6" />
        </>
      )}
    </svg>
  );
}
