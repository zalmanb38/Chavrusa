"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import ErrorNote from "@/components/ErrorNote";

export default function ReportButton({
  currentUserId,
  reportedId,
}: {
  currentUserId: string;
  reportedId: string;
}) {
  const t = useTranslations("Safety");

  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { error: insertError } = await supabase.from("reports").insert({
      reporter_id: currentUserId,
      reported_id: reportedId,
      reason,
    });

    setSubmitting(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setSubmitted(true);
    setOpen(false);
  }

  if (submitted) {
    return <span className="text-xs text-muted">{t("reportSubmitted")}</span>;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-muted underline"
      >
        {t("report")}
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-3"
    >
      <label className="flex flex-col gap-1 text-xs">
        {t("reportReasonLabel")}
        <textarea
          required
          minLength={3}
          value={reason}
          placeholder={t("reportReasonPlaceholder")}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          className="rounded-lg border border-border bg-transparent px-2.5 py-1.5 text-xs focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
        />
      </label>

      {error && <ErrorNote size="xs">{error}</ErrorNote>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground disabled:opacity-50"
        >
          {t("reportSubmit")}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full px-3 py-1 text-xs text-muted"
        >
          {t("reportCancel")}
        </button>
      </div>
    </form>
  );
}
