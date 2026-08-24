"use client";

import { useEffect, useId, useRef, useState } from "react";

export interface MultiSelectOption {
  value: string;
  label: string;
}

/**
 * A multi-select that reads as one control instead of a row of boxes.
 *
 * The checkboxes are the real form inputs — the panel is hidden with CSS
 * rather than unmounted, because an unmounted checkbox submits nothing
 * and closing the panel would silently drop the filter.
 */
export default function MultiSelectFilter({
  name,
  label,
  options,
  initialSelected,
  emptyLabel,
  countLabel,
}: {
  name: string;
  label: string;
  options: MultiSelectOption[];
  initialSelected: string[];
  emptyLabel: string;
  /** Rendered with the number once more than two are picked. */
  countLabel: (count: number) => string;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(initialSelected);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // Up to two, name them — it's shorter than "2 selected" and says more.
  const summary =
    selected.length === 0
      ? emptyLabel
      : selected.length <= 2
        ? options
            .filter((o) => selected.includes(o.value))
            .map((o) => o.label)
            .join(", ")
        : countLabel(selected.length);

  return (
    <div ref={containerRef} className="relative flex flex-col gap-1 text-sm">
      <span>{label}</span>

      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between gap-2 rounded-xl border border-border bg-transparent px-3 py-2 text-start text-sm focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
      >
        <span className={selected.length === 0 ? "text-muted" : undefined}>
          {summary}
        </span>
        <span aria-hidden className="text-muted">
          {open ? "▴" : "▾"}
        </span>
      </button>

      <div
        id={panelId}
        hidden={!open}
        className="absolute top-full z-20 mt-1 flex max-h-64 w-max min-w-full flex-col gap-2 overflow-y-auto rounded-xl border border-border bg-surface p-3 shadow-lg"
      >
        {options.map((option) => (
          <label key={option.value} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name={name}
              value={option.value}
              checked={selected.includes(option.value)}
              onChange={() =>
                setSelected((prev) =>
                  prev.includes(option.value)
                    ? prev.filter((v) => v !== option.value)
                    : [...prev, option.value],
                )
              }
              className="accent-primary"
            />
            {option.label}
          </label>
        ))}
      </div>
    </div>
  );
}
