"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import type { ConnectStatus } from "@/lib/connect";

export default function ConnectButton({
  currentUserId,
  recipientId,
  initialStatus,
}: {
  currentUserId: string;
  recipientId: string;
  initialStatus: ConnectStatus;
}) {
  const t = useTranslations("Browse");
  const router = useRouter();

  const [status, setStatus] = useState(initialStatus);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConnect() {
    setSending(true);
    setError(null);

    const supabase = createClient();
    const { error: insertError } = await supabase
      .from("connect_requests")
      .insert({ requester_id: currentUserId, recipient_id: recipientId });

    setSending(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setStatus("pending_sent");
    router.refresh();
  }

  if (status === "matched") {
    return (
      <span className="mt-1 w-fit rounded-md bg-green-100 px-3 py-1.5 text-sm text-green-800 dark:bg-green-900/40 dark:text-green-300">
        {t("matched")}
      </span>
    );
  }

  if (status === "pending_sent") {
    return (
      <span className="mt-1 w-fit rounded-md border border-black/15 px-3 py-1.5 text-sm text-black/50 dark:border-white/20 dark:text-white/50">
        {t("requestSent")}
      </span>
    );
  }

  if (status === "pending_received") {
    return (
      <Link
        href="/requests"
        className="mt-1 w-fit rounded-md border border-black/15 px-3 py-1.5 text-sm font-medium hover:bg-black/[.03] dark:border-white/20 dark:hover:bg-white/[.06]"
      >
        {t("respond")}
      </Link>
    );
  }

  if (status === "declined") {
    return null;
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleConnect}
        disabled={sending}
        className="mt-1 w-fit rounded-md border border-black/15 px-3 py-1.5 text-sm font-medium hover:bg-black/[.03] disabled:opacity-50 dark:border-white/20 dark:hover:bg-white/[.06]"
      >
        {t("connect")}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
