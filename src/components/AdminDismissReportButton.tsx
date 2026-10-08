"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import ErrorNote from "@/components/ErrorNote";

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

    // One call: the report is marked dismissed (kept, with who and when)
    // and any pending request between the two is resolved alongside it.
    const supabase = createClient();
    const { error: dismissError } = await supabase.rpc("admin_dismiss_report", {
      report_id: reportId,
    });

    setLoading(false);

    if (dismissError) {
      setError(dismissError.message);
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
      {error && <ErrorNote size="xs">{error}</ErrorNote>}
    </div>
  );
}
