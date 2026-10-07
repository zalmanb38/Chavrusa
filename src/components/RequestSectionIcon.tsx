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
      {/* Both request icons are the open book with an arrow beside it,
          the arrow reversed between them.

          The book is drawn with both pages, not one. A single page and a
          spine is a rectangle with a line in it — at this size it read as
          an empty box, and only the two-page silhouette is recognisably a
          book. The arrows are horizontal rather than diagonal for the
          same reason: at 22px a diagonal reads as a tick either way round
          and the pair stopped being distinguishable, which is the one
          thing they must not be. */}
      {kind === "incoming" && (
        <>
          <path d="M7.5 8C6 6.9 4.2 6.4 2 6.6v10.8c2.2-.2 4 .3 5.5 1.4" />
          <path d="M7.5 8C9 6.9 10.8 6.4 13 6.6v10.8c-2.2-.2-4 .3-5.5 1.4" />
          <path d="M7.5 8v10.8" />
          <path d="M22 12.7h-6.5" />
          <path d="M18.5 9.5 15.3 12.7l3.2 3.2" />
        </>
      )}

      {kind === "outgoing" && (
        <>
          <path d="M7.5 8C6 6.9 4.2 6.4 2 6.6v10.8c2.2-.2 4 .3 5.5 1.4" />
          <path d="M7.5 8C9 6.9 10.8 6.4 13 6.6v10.8c-2.2-.2-4 .3-5.5 1.4" />
          <path d="M7.5 8v10.8" />
          <path d="M15.5 12.7H22" />
          <path d="M18.8 9.5 22 12.7l-3.2 3.2" />
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
