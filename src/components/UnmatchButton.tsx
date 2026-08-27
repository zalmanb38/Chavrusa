"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import ErrorNote from "@/components/ErrorNote";

/**
 * Ends a match. Two-step rather than one click: unmatching deletes the
 * shared schedule and re-hides both people's name and photo, none of
 * which comes back by pressing undo.
 */
export default function UnmatchButton({
  requestId,
  partnerName,
  redirectAfter,
  variant = "user",
}: {
  requestId: string;
  partnerName?: string;
  redirectAfter?: string;
  /** Admin ending someone else's match gets plainer wording. */
  variant?: "user" | "admin";
}) {
  const t = useTranslations("Match");
  const router = useRouter();

  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function unmatch() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/matches/unmatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId }),
      });
      if (!response.ok) {
        setError(t("unmatchFailed"));
        return;
      }
      if (redirectAfter) {
        router.push(redirectAfter);
      }
      router.refresh();
    } catch {
      setError(t("unmatchFailed"));
    } finally {
      setBusy(false);
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="w-fit text-sm text-muted underline"
      >
        {variant === "admin" ? t("unmatchAdmin") : t("unmatch")}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border p-3">
      <p className="text-sm">
        {variant === "admin"
          ? t("unmatchAdminConfirm")
          : t("unmatchConfirm", { name: partnerName ?? "" })}
      </p>
      <p className="text-xs text-muted">{t("unmatchConsequences")}</p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={unmatch}
          className="rounded-sm bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {busy ? t("unmatching") : t("unmatchYes")}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => setConfirming(false)}
          className="rounded-sm border border-border px-4 py-1.5 text-sm disabled:opacity-60"
        >
          {t("unmatchCancel")}
        </button>
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}
    </div>
  );
}
