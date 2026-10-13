"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import ErrorNote from "@/components/ErrorNote";
import { notifyAdmin } from "@/lib/admin-notify";

export default function ReportButton({
  currentUserId,
  reportedId,
  connectRequestId,
}: {
  currentUserId: string;
  reportedId: string;
  /**
   * Set when reporting from inside a match, so the report names the
   * conversation. Reporting a profile and reporting something written in
   * a thread are different acts, and an admin can't judge the second
   * without seeing what was said.
   */
  connectRequestId?: string;
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

    // Generated here rather than read back after the insert: there is no
    // RLS select policy letting a reporter read their own row (only
    // admins can list reports), so a trailing .select() would come back
    // empty and look like the report itself had failed. Supplying the id
    // up front sidesteps that without touching what reporters are
    // allowed to see.
    const reportId = crypto.randomUUID();

    const supabase = createClient();
    const { error: insertError } = await supabase.from("reports").insert({
      id: reportId,
      reporter_id: currentUserId,
      reported_id: reportedId,
      reason,
      ...(connectRequestId ? { connect_request_id: connectRequestId } : {}),
    });

    setSubmitting(false);

    if (insertError) {
      // The cap lives in an RLS policy, so hitting it comes back as a
      // policy violation rather than something a person can read. Any
      // other failure keeps its own message, which is usually the useful
      // one.
      setError(
        insertError.code === "42501"
          ? t("reportRateLimited")
          : insertError.message,
      );
      return;
    }

    // Best effort: the report is already filed and visible in the admin
    // queue regardless of whether this email goes anywhere.
    notifyAdmin("report_filed", reportId);

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
          className="rounded-sm bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground disabled:opacity-50"
        >
          {t("reportSubmit")}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-sm px-3 py-1 text-xs text-muted"
        >
          {t("reportCancel")}
        </button>
      </div>
    </form>
  );
}
