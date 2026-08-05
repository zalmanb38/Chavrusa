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
          className="rounded-full bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
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
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
