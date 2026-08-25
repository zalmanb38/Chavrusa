"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import ErrorNote from "@/components/ErrorNote";

export default function RemoveResolvedRequestButton({
  requestId,
}: {
  requestId: string;
}) {
  const t = useTranslations("Requests");
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRemove() {
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("connect_requests")
      .delete()
      .eq("id", requestId);

    setLoading(false);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleRemove}
        disabled={loading}
        className="text-xs text-muted underline disabled:opacity-50"
      >
        {t("removeResolved")}
      </button>
      {error && <ErrorNote size="xs">{error}</ErrorNote>}
    </div>
  );
}
