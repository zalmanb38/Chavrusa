"use client";

import { useState } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { notify } from "@/lib/notify";
import type { StudySession } from "@/lib/sessions";
import ErrorNote from "@/components/ErrorNote";

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

    // Confirming is what unlocks contact details for both sides, so it's
    // the moment the other person most needs to hear about.
    if (patch.status === "confirmed") notify("session_confirmed", session.id);

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
      ? "text-accent"
      : session.status === "cancelled"
        ? "text-muted/70"
        : "text-muted";

  return (
    <li className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-medium">
          {format.dateTime(new Date(session.scheduled_at), {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </span>
        <span className={`text-sm ${statusClass}`}>{statusLabel}</span>
      </div>

      {session.note && <p className="text-sm text-muted">{session.note}</p>}

      {error && <ErrorNote size="xs">{error}</ErrorNote>}

      {isMyTurn && !showCounter && (
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={() => updateSession("confirm", { status: "confirmed" })}
            disabled={loading !== null}
            className="rounded-sm bg-primary px-3.5 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {t("confirm")}
          </button>
          <button
            type="button"
            onClick={() => setShowCounter(true)}
            disabled={loading !== null}
            className="rounded-sm border border-border px-3.5 py-1.5 text-sm font-medium hover:bg-foreground/5 disabled:opacity-50"
          >
            {t("suggestDifferentTime")}
          </button>
          <button
            type="button"
            onClick={() => updateSession("cancel", { status: "cancelled" })}
            disabled={loading !== null}
            className="rounded-sm px-3.5 py-1.5 text-sm text-muted disabled:opacity-50"
          >
            {t("cancel")}
          </button>
        </div>
      )}

      {isMyTurn && showCounter && (
        <form
          onSubmit={handleCounterSubmit}
          className="flex flex-wrap items-end gap-2 pt-1"
        >
          <label className="flex flex-col gap-1 text-sm">
            {t("dateTimeLabel")}
            <input
              type="datetime-local"
              required
              value={counterTime}
              onChange={(e) => setCounterTime(e.target.value)}
              className="rounded-xl border border-border bg-transparent px-3.5 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
            />
          </label>
          <button
            type="submit"
            disabled={loading !== null}
            className="rounded-sm bg-primary px-3.5 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {t("proposeSubmit")}
          </button>
          <button
            type="button"
            onClick={() => setShowCounter(false)}
            className="rounded-sm px-3.5 py-1.5 text-sm text-muted"
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
          className="w-fit rounded-sm px-3.5 py-1.5 text-sm text-muted disabled:opacity-50"
        >
          {t("withdraw")}
        </button>
      )}
    </li>
  );
}
