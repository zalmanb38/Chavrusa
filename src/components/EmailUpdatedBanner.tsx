"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

/**
 * Confirms the address actually moved, after the round-trip through the
 * confirmation link. A sibling of AccountLinkedBanner rather than a
 * parameter on it: the two say different things and arrive from
 * different flows, and merging them would mean one component reasoning
 * about which of two unrelated events it was rendering.
 */
export default function EmailUpdatedBanner() {
  const t = useTranslations("Account");
  const params = useSearchParams();

  if (params.get("emailChanged") !== "1") return null;

  return (
    <p className="border-s-2 border-primary bg-slate-100 px-4 py-3 text-sm text-slate-700">
      {t("emailUpdated")}
    </p>
  );
}
