// Uses the theme's --foreground/--primary tokens (rather than hardcoded
// hex) so the mark stays legible in dark mode, where the header
// background is a dark green close to the light-mode stroke color.
export default function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
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
      <path
        d="M22 32 C28 30 34 30 40 33"
        stroke="var(--foreground)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M22 42 C28 40 34 40 40 43"
        stroke="var(--foreground)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M60 33 C66 30 72 30 78 32"
        stroke="var(--foreground)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M60 43 C66 40 72 40 78 42"
        stroke="var(--foreground)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
