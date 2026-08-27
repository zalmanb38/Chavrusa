import Image from "next/image";

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
  priority = false,
}: {
  /** Art direction for this slot, shown while empty. */
  direction: string;
  /** Slot height in px, per the design. */
  height: number;
  src?: string;
  alt?: string;
  className?: string;
  /** Set on the homepage hero, which is the page's largest paint. */
  priority?: boolean;
}) {
  if (src) {
    return (
      // next/image rather than a bare <img>: these files are 250-675KB
      // each as shot, and serving them unresized would cost more than the
      // rest of the page put together. fill + sizes lets it pick a width
      // per breakpoint and re-encode to AVIF/WebP.
      <div
        style={{ height }}
        className={`relative w-full overflow-hidden ${className ?? ""}`}
      >
        <Image
          src={src}
          alt={alt ?? ""}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1240px) 50vw, 620px"
          className="halftone object-cover"
          priority={priority}
        />
      </div>
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
