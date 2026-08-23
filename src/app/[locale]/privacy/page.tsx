import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import LegalDocument from "@/components/LegalDocument";
import { getLegalContent } from "@/content/legal";

// Public by design: no auth check here, so it renders for signed-out
// visitors and for crawlers such as Google's OAuth review.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return { title: `${getLegalContent(locale).privacy.title} · Chavrusa Link` };
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const content = getLegalContent(locale);

  return (
    <LegalDocument
      doc={content.privacy}
      translationNote={content.translationNote}
    />
  );
}
