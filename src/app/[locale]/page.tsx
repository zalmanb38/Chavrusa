import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Landing");

  const steps = [
    { title: t("step1Title"), body: t("step1Body") },
    { title: t("step2Title"), body: t("step2Body") },
    { title: t("step3Title"), body: t("step3Body") },
  ];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-16 px-4 py-12 sm:py-20">
      <section className="flex flex-col items-start gap-5 text-start">
        <h1 className="text-3xl font-semibold sm:text-4xl">{t("title")}</h1>
        <p className="max-w-xl text-base text-black/70 dark:text-white/70">
          {t("subtitle")}
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/signup"
            className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
          >
            {t("ctaSignup")}
          </Link>
          <Link
            href="/browse"
            className="rounded-md border border-black/15 px-4 py-2 text-sm font-medium dark:border-white/20"
          >
            {t("ctaBrowse")}
          </Link>
        </div>
      </section>

      <section className="flex flex-col gap-6">
        <h2 className="text-xl font-semibold">{t("howItWorksTitle")}</h2>
        <ol className="grid gap-6 sm:grid-cols-3">
          {steps.map((step, i) => (
            <li
              key={step.title}
              className="flex flex-col gap-2 rounded-lg border border-black/10 p-4 dark:border-white/10"
            >
              <span className="text-sm font-medium text-black/50 dark:text-white/50">
                {i + 1}
              </span>
              <h3 className="font-medium">{step.title}</h3>
              <p className="text-sm text-black/70 dark:text-white/70">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <p className="text-sm text-black/60 dark:text-white/60">
        {t("freeNotice")}
      </p>
    </div>
  );
}
