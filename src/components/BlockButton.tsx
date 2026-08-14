"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";

export default function BlockButton({
  currentUserId,
  blockedId,
  blockedName,
  redirectAfter,
}: {
  currentUserId: string;
  blockedId: string;
  blockedName: string;
  redirectAfter?: string;
}) {
  const t = useTranslations("Safety");
  const router = useRouter();

  const [confirming, setConfirming] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setBlocking(true);
    setError(null);

    const supabase = createClient();
    const { error: insertError } = await supabase.from("blocks").insert({
      blocker_id: currentUserId,
      blocked_id: blockedId,
    });

    setBlocking(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    if (redirectAfter) {
      router.push(redirectAfter);
    }
    router.refresh();
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-xs text-muted underline"
      >
        {t("block")}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-3">
      <p className="text-xs">
        {t("blockConfirmQuestion", { name: blockedName })}
      </p>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={blocking}
          className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground disabled:opacity-50"
        >
          {t("blockConfirmButton")}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="rounded-full px-3 py-1 text-xs text-muted"
        >
          {t("blockCancelButton")}
        </button>
      </div>
    </div>
  );
}
