"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/**
 * States plainly who the site is for at the moment.
 *
 * Placed where the answer is needed before someone invests effort —
 * beside sign-up and on About — rather than buried in terms. The site has
 * no gender field and no gender-aware matching, so this is the only thing
 * saying so.
 */
// A client component so it can sit on the sign-up page, which is one
// itself. It takes no props, so nothing crosses the boundary.
export default function MenOnlyNotice({
  className,
}: {
  className?: string;
}) {
  const t = useTranslations("Notice");

  return (
    <p
      className={`border-s-2 border-brass bg-surface px-4 py-3 text-sm ${className ?? ""}`}
    >
      {t.rich("menOnly", {
        link: (chunks) => (
          <Link href="/contact" className="text-slate-600 underline hover:text-brass">
            {chunks}
          </Link>
        ),
      })}
    </p>
  );
}
