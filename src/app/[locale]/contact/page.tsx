import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import ContactForm from "@/components/ContactForm";
import { SUPPORT_EMAIL } from "@/lib/site";

// Public by design: no auth check, so anyone — including someone locked
// out of their account, or suspended — can reach us.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Contact" });
  return { title: `${t("title")} · Chavrusa Link` };
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Contact");

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-[2rem] font-semibold sm:text-[34px]">{t("title")}</h1>
        <p className="text-sm text-muted">{t("subtitle")}</p>
      </div>

      <ContactForm />

      <p className="text-sm text-muted">
        {t("orEmail")}{" "}
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="font-medium text-primary underline"
          dir="ltr"
        >
          {SUPPORT_EMAIL}
        </a>
      </p>
    </div>
  );
}
