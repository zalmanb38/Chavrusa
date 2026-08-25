"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { notify } from "@/lib/notify";
import ErrorNote from "@/components/ErrorNote";

export default function RespondButtons({ requestId }: { requestId: string }) {
  const t = useTranslations("Requests");
  const router = useRouter();
  const [loading, setLoading] = useState<"accept" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function respond(status: "accepted" | "declined") {
    setLoading(status === "accepted" ? "accept" : "decline");
    setError(null);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("connect_requests")
      .update({ status })
      .eq("id", requestId);

    setLoading(null);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    // A decline is deliberately silent — telling someone they were turned
    // down adds nothing they can act on.
    if (status === "accepted") notify("request_accepted", requestId);

    router.refresh();
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => respond("accepted")}
          disabled={loading !== null}
          className="rounded-full bg-primary px-3.5 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {t("accept")}
        </button>
        <button
          type="button"
          onClick={() => respond("declined")}
          disabled={loading !== null}
          className="rounded-full border border-border px-3.5 py-1.5 text-sm font-medium hover:bg-foreground/5 disabled:opacity-50"
        >
          {t("decline")}
        </button>
      </div>
      {error && <ErrorNote size="xs">{error}</ErrorNote>}
    </div>
  );
}
