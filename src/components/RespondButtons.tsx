"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";

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

    router.refresh();
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => respond("accepted")}
          disabled={loading !== null}
          className="rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {t("accept")}
        </button>
        <button
          type="button"
          onClick={() => respond("declined")}
          disabled={loading !== null}
          className="rounded-md border border-black/15 px-3 py-1.5 text-sm font-medium disabled:opacity-50 dark:border-white/20"
        >
          {t("decline")}
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
