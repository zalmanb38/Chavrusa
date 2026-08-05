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
    <div className="flex flex-col">
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(60% 50% at 15% 0%, color-mix(in srgb, var(--primary) 12%, transparent), transparent), radial-gradient(50% 40% at 90% 10%, color-mix(in srgb, var(--accent) 10%, transparent), transparent)",
          }}
        />
        <div className="mx-auto flex max-w-4xl flex-col items-start gap-6 px-4 py-16 text-start sm:py-24">
          <h1 className="font-serif text-4xl leading-tight font-medium text-balance sm:text-5xl">
            {t("title")}
          </h1>
          <p className="max-w-xl text-lg text-muted">{t("subtitle")}</p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/signup"
              className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              {t("ctaSignup")}
            </Link>
            <Link
              href="/browse"
              className="rounded-full border border-border px-6 py-3 text-sm font-medium hover:bg-foreground/5"
            >
              {t("ctaBrowse")}
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:py-12">
        <h2 className="font-serif text-2xl font-medium">
          {t("howItWorksTitle")}
        </h2>
        <ol className="grid gap-5 sm:grid-cols-3">
          {steps.map((step, i) => (
            <li
              key={step.title}
              className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 shadow-sm"
            >
              <span className="flex size-7 items-center justify-center rounded-full bg-accent/15 text-sm font-medium text-accent">
                {i + 1}
              </span>
              <h3 className="font-medium">{step.title}</h3>
              <p className="text-sm text-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <p className="mx-auto w-full max-w-4xl px-4 pb-16 text-sm text-muted">
        {t("freeNotice")}
      </p>
    </div>
  );
}
