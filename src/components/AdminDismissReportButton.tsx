"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminDismissReportButton({
  reportId,
}: {
  reportId: string;
}) {
  const t = useTranslations("Admin");
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDismiss() {
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("reports")
      .delete()
      .eq("id", reportId);

    setLoading(false);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    router.refresh();
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleDismiss}
        disabled={loading}
        className="text-xs text-muted underline disabled:opacity-50"
      >
        {t("dismissReport")}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
