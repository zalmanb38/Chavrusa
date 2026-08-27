"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import type { PhotoStatus } from "@/lib/photos";
import ErrorNote from "@/components/ErrorNote";

export default function AdminPhotoActions({
  photoId,
  status,
}: {
  photoId: string;
  status: PhotoStatus;
}) {
  const t = useTranslations("Admin");
  const router = useRouter();

  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function review(action: "approve" | "reject") {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoId, action, note }),
      });
      if (!response.ok) {
        setError(t("photoActionFailed"));
        return;
      }
      router.refresh();
    } catch {
      setError(t("photoActionFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 pt-1">
      <input
        type="text"
        value={note}
        maxLength={500}
        placeholder={t("photoNotePlaceholder")}
        onChange={(e) => setNote(e.target.value)}
        className="rounded-xl border border-border bg-transparent px-3 py-2 text-sm"
      />

      <div className="flex flex-wrap gap-2">
        {status !== "approved" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => review("approve")}
            className="rounded-sm bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {t("photoApprove")}
          </button>
        )}
        {status !== "rejected" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => review("reject")}
            className="rounded-sm border border-border px-4 py-1.5 text-sm disabled:opacity-60"
          >
            {t("photoReject")}
          </button>
        )}
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}
    </div>
  );
}
