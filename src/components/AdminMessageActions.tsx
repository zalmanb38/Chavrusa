"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminMessageActions({
  messageId,
  handled,
}: {
  messageId: string;
  handled: boolean;
}) {
  const t = useTranslations("Admin");
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleHandled() {
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("contact_messages")
      .update({ handled: !handled })
      .eq("id", messageId);

    setLoading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={toggleHandled}
        disabled={loading}
        className="text-xs text-muted underline disabled:opacity-50"
      >
        {handled ? t("markUnhandled") : t("markHandled")}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
