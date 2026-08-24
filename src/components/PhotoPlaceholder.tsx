/**
 * Stands in wherever a photo would go but isn't there — not uploaded, not
 * yet approved, or not yet revealed. An open book, echoing the site mark,
 * so an empty slot still looks deliberate rather than broken.
 */
export default function PhotoPlaceholder({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-center rounded-2xl border border-border bg-surface ${className ?? ""}`}
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-1/2 w-1/2 opacity-45"
        aria-hidden="true"
      >
        <path
          d="M50 30 C40 22 25 20 15 24 V70 C25 66 40 68 50 76 C60 68 75 66 85 70 V24 C75 20 60 22 50 30 Z"
          fill="none"
          stroke="var(--foreground)"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <line
          x1="50"
          y1="30"
          x2="50"
          y2="76"
          stroke="var(--primary)"
          strokeWidth="2.5"
        />
      </svg>
    </div>
  );
}
