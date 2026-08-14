"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminDeactivateButton({
  profileId,
  isActive,
}: {
  profileId: string;
  isActive: boolean;
}) {
  const t = useTranslations("Admin");
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleToggle() {
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ is_active: !isActive })
      .eq("id", profileId);

    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.refresh();
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleToggle}
        disabled={loading}
        className="rounded-full border border-border px-3.5 py-1.5 text-sm font-medium hover:bg-foreground/5 disabled:opacity-50"
      >
        {isActive ? t("deactivateProfile") : t("reactivateProfile")}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
