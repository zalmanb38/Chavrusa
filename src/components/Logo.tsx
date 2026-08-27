/**
 * The open-book mark, per BRAND-ASSETS.md §1.
 *
 * Two facing pages drawn in `currentColor` so the mark takes the ink of
 * whatever it sits in, and a spine in the accent. On an ink ground the
 * pages come out paper-white on their own; the spine cannot, so it reads
 * `--logo-spine` and a reversed band overrides that to gold.
 *
 * Always `aria-hidden`: the brief is that the mark never appears without
 * the wordmark beside it (the favicon is a separate file), so labelling
 * it here would have every nav announce the name twice.
 */
export default function Logo({
  className,
  strokeWidth = 1.8,
}: {
  className?: string;
  /** Raise to 2.2 below 20px, or the pages close up. */
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M16 9.4C13 7.2 9.2 6.4 4.5 6.9v17.4c4.7-.5 8.5.3 11.5 2.5"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <path
        d="M16 9.4c3-2.2 6.8-3 11.5-2.5v17.4c-4.7-.5-8.5.3-11.5 2.5"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <path
        d="M16 9.4v17.4"
        stroke="var(--logo-spine, #1c4b8f)"
        strokeWidth={strokeWidth}
      />
    </svg>
  );
}
