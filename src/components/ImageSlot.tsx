/**
 * A reserved photograph slot, standing in until real photography exists.
 *
 * The handoff's art direction is firm and unusually specific — "objects
 * and texts only: seforim, a shtender, a bookshelf, handwriting. No
 * faces, no stock-photo handshakes, no illustrations of people" — so the
 * direction is carried here in the placeholder rather than living only in
 * a document. Whoever fills these in shouldn't have to go looking for it.
 *
 * Every image is meant to print through a newsprint dot screen so it sits
 * *into* the paper rather than on top of it; `halftone` applies that once
 * a real image is passed.
 */
export default function ImageSlot({
  direction,
  height,
  src,
  alt,
  className,
}: {
  /** Art direction for this slot, shown while empty. */
  direction: string;
  /** Slot height in px, per the design. */
  height: number;
  src?: string;
  alt?: string;
  className?: string;
}) {
  if (src) {
    return (
      /* Signed and remote URLs vary by host, so next/image's
         remotePatterns model doesn't fit these. */
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt ?? ""}
        style={{ height }}
        className={`halftone w-full object-cover ${className ?? ""}`}
      />
    );
  }

  return (
    <div
      style={{ height }}
      className={`flex w-full flex-col justify-end gap-1 border border-dashed border-neutral-400 bg-surface p-4 ${className ?? ""}`}
      aria-hidden
    >
      <span className="text-[11px] tracking-[0.14em] text-muted uppercase">
        Photograph
      </span>
      <span className="text-sm text-muted italic">{direction}</span>
    </div>
  );
}
