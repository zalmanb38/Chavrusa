"use client";

import { useTranslations } from "next-intl";

// Sending real connect requests lands in the next phase (matching &
// scheduling). For now this is a friendly placeholder so the browse flow
// feels complete end-to-end.
export default function ConnectButton({
  recipientId,
}: {
  recipientId: string;
}) {
  const t = useTranslations("Browse");

  return (
    <button
      type="button"
      disabled
      title={t("comingSoon")}
      data-recipient-id={recipientId}
      className="mt-1 w-fit cursor-not-allowed rounded-md border border-black/15 px-3 py-1.5 text-sm text-black/40 dark:border-white/20 dark:text-white/40"
    >
      {t("connect")}
    </button>
  );
}
