"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

/**
 * Shown once, after Supabase has silently linked a Google identity to an
 * existing password account. The banner explains what changed; without
 * it, someone who signed up with a password just finds themselves signed
 * in and has no idea both routes now work.
 */
export default function AccountLinkedBanner() {
  const t = useTranslations("Auth");
  const params = useSearchParams();

  if (params.get("linked") !== "1") return null;

  return (
    <p className="border-s-2 border-primary bg-slate-100 px-4 py-3 text-sm text-slate-700">
      {t("accountLinked")}
    </p>
  );
}
