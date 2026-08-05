"use client";

import { useState } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import type { StudySession } from "@/lib/sessions";

export default function SessionCard({
  session,
  currentUserId,
  otherUserName,
}: {
  session: StudySession;
  currentUserId: string;
  otherUserName: string;
}) {
  const t = useTranslations("Schedule");
  const format = useFormatter();
  const router = useRouter();

  const [showCounter, setShowCounter] = useState(false);
  const [counterTime, setCounterTime] = useState("");
  const [loading, setLoading] = useState<
    "confirm" | "cancel" | "counter" | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  const isMyTurn =
    session.status === "proposed" && session.proposed_by !== currentUserId;
  const isWaiting =
    session.status === "proposed" && session.proposed_by === currentUserId;

  async function updateSession(
    action: "confirm" | "cancel" | "counter",
    patch: Record<string, unknown>,
  ) {
    setLoading(action);
    setError(null);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("study_sessions")
      .update(patch)
      .eq("id", session.id);

    setLoading(null);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.refresh();
  }

  async function handleCounterSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!counterTime) return;
    await updateSession("counter", {
      scheduled_at: new Date(counterTime).toISOString(),
      proposed_by: currentUserId,
      status: "proposed",
    });
    setShowCounter(false);
    setCounterTime("");
  }

  const statusLabel =
    session.status === "confirmed"
      ? t("statusConfirmed")
      : session.status === "cancelled"
        ? t("statusCancelled")
        : isMyTurn
          ? t("statusYourTurn")
          : t("statusWaiting", { name: otherUserName });

  const statusClass =
    session.status === "confirmed"
      ? "text-green-700 dark:text-green-400"
      : session.status === "cancelled"
        ? "text-black/40 dark:text-white/40"
        : "text-black/60 dark:text-white/60";

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-black/10 p-4 dark:border-white/10">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-medium">
          {format.dateTime(new Date(session.scheduled_at), {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </span>
        <span className={`text-sm ${statusClass}`}>{statusLabel}</span>
      </div>

      {session.note && (
        <p className="text-sm text-black/70 dark:text-white/70">
          {session.note}
        </p>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}

      {isMyTurn && !showCounter && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => updateSession("confirm", { status: "confirmed" })}
            disabled={loading !== null}
            className="rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {t("confirm")}
          </button>
          <button
            type="button"
            onClick={() => setShowCounter(true)}
            disabled={loading !== null}
            className="rounded-md border border-black/15 px-3 py-1.5 text-sm font-medium disabled:opacity-50 dark:border-white/20"
          >
            {t("suggestDifferentTime")}
          </button>
          <button
            type="button"
            onClick={() => updateSession("cancel", { status: "cancelled" })}
            disabled={loading !== null}
            className="rounded-md px-3 py-1.5 text-sm text-black/50 disabled:opacity-50 dark:text-white/50"
          >
            {t("cancel")}
          </button>
        </div>
      )}

      {isMyTurn && showCounter && (
        <form
          onSubmit={handleCounterSubmit}
          className="flex flex-wrap items-end gap-2"
        >
          <label className="flex flex-col gap-1 text-sm">
            {t("dateTimeLabel")}
            <input
              type="datetime-local"
              required
              value={counterTime}
              onChange={(e) => setCounterTime(e.target.value)}
              className="rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/20 dark:bg-transparent"
            />
          </label>
          <button
            type="submit"
            disabled={loading !== null}
            className="rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {t("proposeSubmit")}
          </button>
          <button
            type="button"
            onClick={() => setShowCounter(false)}
            className="rounded-md px-3 py-1.5 text-sm text-black/50 dark:text-white/50"
          >
            {t("cancel")}
          </button>
        </form>
      )}

      {isWaiting && (
        <button
          type="button"
          onClick={() => updateSession("cancel", { status: "cancelled" })}
          disabled={loading !== null}
          className="w-fit rounded-md px-3 py-1.5 text-sm text-black/50 disabled:opacity-50 dark:text-white/50"
        >
          {t("withdraw")}
        </button>
      )}
    </li>
  );
}
