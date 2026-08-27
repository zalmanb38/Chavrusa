"use client";

import { useTranslations } from "next-intl";

/**
 * Who the site is for, said early and once per place.
 *
 * Two placements, two shapes, per 3E: on About it sits above the fold
 * between two gold rules; on sign-up it sits under the heading on a gold
 * left rule, before anyone types anything. Both are stated plainly, with
 * no apology and no justification nobody asked for.
 */
export default function MenOnlyNotice({
  variant,
  className,
}: {
  variant: "about" | "signup";
  className?: string;
}) {
  const t = useTranslations("Notice");

  if (variant === "signup") {
    return (
      <p
        className={`border-s-2 border-brass ps-3 text-sm ${className ?? ""}`}
      >
        {t("menOnlySignup")}
      </p>
    );
  }

  return (
    <section
      className={`flex flex-col gap-2 border-y-2 border-brass py-5 ${className ?? ""}`}
    >
      <h2 className="text-[11.5px] tracking-[0.14em] text-muted uppercase">
        {t("menOnlyLabel")}
      </h2>
      <p className="text-[17px]">{t("menOnlyAbout")}</p>
      <p className="text-sm text-muted">{t("menOnlyAboutAfter")}</p>
    </section>
  );
}
