"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import ErrorNote from "@/components/ErrorNote";

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

type Verdict = "available" | "taken" | "unknown";

type Answer = {
  /** What was asked, so a late reply for an older handle is ignored. */
  candidate: string;
  verdict: Verdict;
  suggestions: string[];
};

/**
 * The handle field, which answers while someone is still typing rather
 * than at save time.
 *
 * Only the server's answer is held in state. Whether the handle is empty
 * or malformed is read straight off the value during render — storing
 * that too would mean setting state from an effect for something already
 * known, and the two copies could disagree for a frame.
 *
 * Trimming and lower-casing happen on input, not on blur: a handle has
 * one spelling, and letting a capital sit in the box only to be changed
 * underneath them on save reads as the site losing their edit.
 */
export default function UsernameField({
  value,
  onChange,
  inputClass,
}: {
  value: string;
  onChange: (value: string) => void;
  inputClass: string;
}) {
  const t = useTranslations("Profile");
  const [answer, setAnswer] = useState<Answer | null>(null);

  const candidate = value.trim();
  // Empty is the field's resting state, not a mistake: the handle is
  // optional, so saying "too short" at nothing typed would be noise.
  const shape =
    candidate === ""
      ? "empty"
      : USERNAME_PATTERN.test(candidate)
        ? "askable"
        : "invalid";

  useEffect(() => {
    if (shape !== "askable") return;

    // Long enough that a handle typed straight through costs one query
    // instead of one per letter, short enough to feel like an answer.
    const timer = setTimeout(async () => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("username_status", {
        p_candidate: candidate,
      });

      // A failed check is not a verdict, so it says nothing: saving still
      // has the unique index behind it.
      if (error || !data) {
        setAnswer({ candidate, verdict: "unknown", suggestions: [] });
        return;
      }

      const result = data as { status: Verdict; suggestions: string[] };
      setAnswer({
        candidate,
        verdict: result.status,
        suggestions: result.suggestions ?? [],
      });
    }, 400);

    return () => clearTimeout(timer);
  }, [candidate, shape]);

  const settled = answer?.candidate === candidate ? answer : null;
  const status =
    shape === "empty"
      ? "idle"
      : shape === "invalid"
        ? "invalid"
        : settled === null
          ? "checking"
          : settled.verdict;

  return (
    <label className="flex flex-col gap-1.5 text-sm">
      {t("username")}
      <input
        type="text"
        maxLength={20}
        value={value}
        placeholder={t("usernamePlaceholder")}
        autoComplete="off"
        spellCheck={false}
        // Latin-only by nature, so it stays left-to-right even on the
        // Hebrew side of the site.
        dir="ltr"
        onChange={(e) => onChange(e.target.value.trim().toLowerCase())}
        aria-describedby="username-status"
        className={inputClass}
      />

      <span id="username-status" aria-live="polite" className="text-xs">
        {status === "checking" && (
          <span className="text-muted">{t("usernameChecking")}</span>
        )}
        {status === "available" && (
          <span className="text-accent">{t("usernameAvailable")}</span>
        )}
      </span>

      {/* Clay is the product's one alert colour, and a note under a single
          field is what ErrorNote's `xs` size is for. */}
      {status === "taken" && (
        <ErrorNote size="xs">{t("usernameTaken")}</ErrorNote>
      )}
      {status === "invalid" && (
        <ErrorNote size="xs">{t("usernameInvalid")}</ErrorNote>
      )}

      {status === "taken" && (settled?.suggestions.length ?? 0) > 0 && (
        <span className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted">{t("usernameSuggestions")}</span>
          {settled?.suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              dir="ltr"
              onClick={() => onChange(suggestion)}
              className="rounded-full border border-border px-2.5 py-1 font-medium text-primary hover:border-primary"
            >
              {suggestion}
            </button>
          ))}
        </span>
      )}

      <span className="text-xs text-muted">{t("usernameHint")}</span>
    </label>
  );
}
