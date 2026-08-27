"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { notify } from "@/lib/notify";
import type { ConnectStatus } from "@/lib/connect";
import ErrorNote from "@/components/ErrorNote";

export default function ConnectButton({
  currentUserId,
  recipientId,
  initialStatus,
  requestId,
}: {
  currentUserId: string;
  recipientId: string;
  initialStatus: ConnectStatus;
  requestId: string | null;
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
    const { data: inserted, error: insertError } = await supabase
      .from("connect_requests")
      .insert({ requester_id: currentUserId, recipient_id: recipientId })
      .select("id")
      .single();

    setSending(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    if (inserted?.id) notify("connect_request", inserted.id);

    setStatus("pending_sent");
    router.refresh();
  }

  if (status === "matched") {
    return requestId ? (
      <Link
        href={`/matches/${requestId}`}
        className="mt-1 w-fit rounded-sm bg-accent/15 px-3.5 py-1.5 text-sm font-medium text-accent hover:bg-accent/25"
      >
        {t("matched")}
      </Link>
    ) : (
      <span className="mt-1 w-fit rounded-sm bg-accent/15 px-3.5 py-1.5 text-sm font-medium text-accent">
        {t("matched")}
      </span>
    );
  }

  if (status === "pending_sent") {
    return (
      <span className="mt-1 w-fit rounded-sm border border-border px-3.5 py-1.5 text-sm text-muted">
        {t("requestSent")}
      </span>
    );
  }

  if (status === "pending_received") {
    return (
      <Link
        href="/requests"
        className="mt-1 w-fit rounded-sm border border-border px-3.5 py-1.5 text-sm font-medium hover:bg-foreground/5"
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
        className="mt-1 w-fit rounded-sm border border-border px-3.5 py-1.5 text-sm font-medium hover:bg-foreground/5 disabled:opacity-50"
      >
        {t("connect")}
      </button>
      {error && <ErrorNote size="xs">{error}</ErrorNote>}
    </div>
  );
}
