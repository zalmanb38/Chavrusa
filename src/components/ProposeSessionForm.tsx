"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ProposeSessionForm({
  connectRequestId,
  currentUserId,
}: {
  connectRequestId: string;
  currentUserId: string;
}) {
  const t = useTranslations("Schedule");
  const router = useRouter();

  const [scheduledAt, setScheduledAt] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!scheduledAt) return;

    setSaving(true);
    setError(null);

    const supabase = createClient();
    const { error: insertError } = await supabase.from("study_sessions").insert({
      connect_request_id: connectRequestId,
      proposed_by: currentUserId,
      scheduled_at: new Date(scheduledAt).toISOString(),
      note,
    });

    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setScheduledAt("");
    setNote("");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-lg border border-black/10 p-4 dark:border-white/10"
    >
      <h3 className="text-sm font-medium">{t("proposeTitle")}</h3>

      <label className="flex flex-col gap-1 text-sm">
        {t("dateTimeLabel")}
        <input
          type="datetime-local"
          required
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
          className="rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/20 dark:bg-transparent"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        {t("noteLabel")}
        <input
          type="text"
          value={note}
          placeholder={t("notePlaceholder")}
          onChange={(e) => setNote(e.target.value)}
          className="rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/20 dark:bg-transparent"
        />
      </label>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="w-fit rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {t("proposeSubmit")}
      </button>
    </form>
  );
}
