"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import ErrorNote from "@/components/ErrorNote";

export default function AdminDismissReportButton({
  reportId,
  reporterId,
  reportedId,
}: {
  reportId: string;
  reporterId?: string;
  reportedId?: string;
}) {
  const t = useTranslations("Admin");
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDismiss() {
    setLoading(true);
    setError(null);

    const supabase = createClient();

    if (reporterId && reportedId) {
      const { error: resolveError } = await supabase
        .from("connect_requests")
        .update({ status: "admin_resolved" })
        .eq("status", "pending")
        .or(
          `and(requester_id.eq.${reporterId},recipient_id.eq.${reportedId}),and(requester_id.eq.${reportedId},recipient_id.eq.${reporterId})`,
        );

      if (resolveError) {
        setLoading(false);
        setError(resolveError.message);
        return;
      }
    }

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
      {error && <ErrorNote size="xs">{error}</ErrorNote>}
    </div>
  );
}
