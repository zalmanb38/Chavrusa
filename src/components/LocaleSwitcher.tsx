"use client";

import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { locales, localeNames } from "@/i18n/routing";

export default function LocaleSwitcher() {
  const t = useTranslations("Common");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const nextLocale = e.target.value;
    router.replace(
      // @ts-expect-error -- dynamic route params from useParams
      { pathname, params },
      { locale: nextLocale },
    );
  }

  return (
    <label className="inline-flex items-center gap-1 text-sm">
      <span className="sr-only">{t("language")}</span>
      <select
        value={locale}
        onChange={handleChange}
        aria-label={t("language")}
        className="rounded-sm border border-border bg-transparent px-3 py-1 text-sm text-foreground/80"
      >
        {locales.map((l) => (
          <option key={l} value={l}>
            {localeNames[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
