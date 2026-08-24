"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/**
 * Catches render failures below the locale layout, so the nav and footer
 * survive and the reader still has somewhere to go.
 *
 * Next.js deliberately withholds the real message in production, handing
 * over only a digest — the same opaque "Error 327152004" seen during the
 * blocking bug. It's shown here so it can be quoted when reporting the
 * problem, which is the only thing it's good for.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("ErrorPages");

  useEffect(() => {
    console.error("Unhandled render error", error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-start gap-4 px-4 py-24">
      <h1 className="font-serif text-3xl font-medium">{t("errorTitle")}</h1>
      <p className="text-muted">{t("errorBody")}</p>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          {t("tryAgain")}
        </button>
        <Link
          href="/"
          className="rounded-full border border-border px-5 py-2.5 text-sm font-medium hover:bg-foreground/5"
        >
          {t("backHome")}
        </Link>
      </div>

      <p className="text-sm text-muted">
        {t("errorPersists")}{" "}
        <Link href="/contact" className="font-medium text-primary underline">
          {t("contactUs")}
        </Link>
      </p>

      {error.digest && (
        <p className="text-xs text-muted" dir="ltr">
          {t("referenceCode")}: {error.digest}
        </p>
      )}
    </div>
  );
}
