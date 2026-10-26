"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";

/**
 * A password input with an eye that reveals what has been typed.
 *
 * The input is uncontrolled and carries a `name`: the form reads it at
 * submit. A controlled value was the cause of a sign-up that rejected
 * perfectly good passwords — on Android, autofill and password managers
 * can set a field's value without firing the event React listens for, so
 * state stayed empty while the box on screen was full, and the "needs a
 * letter and a number" check ran against nothing.
 *
 * Typing a password you cannot see is the one place on the site where a
 * typo costs a whole round-trip, so the reveal is here rather than left to
 * the browser: only Edge offers one of its own, and the field is
 * `autoComplete`-managed everywhere else.
 *
 * Each field owns its own state, so revealing the password on sign-up does
 * not reveal the confirmation — comparing the two by eye is the point of
 * having both. State is never lifted out of the component and never
 * persisted: a reveal lasts as long as the page does.
 *
 * The label is rendered here (rather than wrapped around this by the
 * caller) because the toggle must sit inside the field's box but outside
 * the label: a button inside a `<label>` activates the label on click.
 */
export default function PasswordField({
  label,
  name,
  hint,
  autoComplete,
  minLength,
  required = true,
}: {
  /** Already translated by the caller, which holds the message namespace. */
  label: string;
  /** The key this field appears under in the form's data. */
  name: string;
  /** Already translated: the rule, shown before anyone can break it. */
  hint?: string;
  autoComplete: "current-password" | "new-password";
  minLength?: number;
  required?: boolean;
}) {
  const t = useTranslations("Auth");
  const id = useId();
  const hintId = `${id}-hint`;
  const [visible, setVisible] = useState(false);

  return (
    <div className="flex flex-col gap-1.5 text-sm">
      <label htmlFor={id}>{label}</label>

      <div className="relative">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          required={required}
          minLength={minLength}
          autoComplete={autoComplete}
          aria-describedby={hint ? hintId : undefined}
          className="w-full rounded-xl border border-border bg-transparent px-3.5 py-2.5 pe-11 text-sm focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
        />

        <button
          type="button"
          onClick={() => setVisible((shown) => !shown)}
          aria-label={visible ? t("hidePassword") : t("showPassword")}
          aria-pressed={visible}
          className="absolute inset-y-0 end-0 flex items-center rounded-e-xl px-3 text-muted hover:text-foreground focus-visible:text-foreground focus-visible:outline-2 focus-visible:outline-primary"
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>

      {hint && (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}

/** Line-art to match the mark: same stroke weight, currentColor. */
function EyeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="size-[18px]"
      aria-hidden="true"
    >
      <path
        d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

/** The same eye, struck through. */
function EyeOffIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="size-[18px]"
      aria-hidden="true"
    >
      <path
        d="M4.2 8.5C3.1 9.8 2.5 12 2.5 12S6 18.2 12 18.2c1.4 0 2.6-.3 3.7-.8M9.7 6.1c.7-.2 1.5-.3 2.3-.3 6 0 9.5 6.2 9.5 6.2s-.9 1.6-2.5 3.1"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M9.9 9.9a3 3 0 0 0 4.2 4.2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path d="M4 20 20 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
