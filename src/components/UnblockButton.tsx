"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import ErrorNote from "@/components/ErrorNote";

export default function UnblockButton({ blockId }: { blockId: string }) {
  const t = useTranslations("Safety");
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUnblock() {
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("blocks")
      .delete()
      .eq("id", blockId);

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
        onClick={handleUnblock}
        disabled={loading}
        className="rounded-sm border border-border px-3.5 py-1.5 text-sm font-medium hover:bg-foreground/5 disabled:opacity-50"
      >
        {t("unblock")}
      </button>
      {error && <ErrorNote size="xs">{error}</ErrorNote>}
    </div>
  );
}
