import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import ProseDocument from "@/components/ProseDocument";
import { getAboutContent } from "@/content/about";

// Public by design: no auth check, so it renders for signed-out visitors
// and for crawlers.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return { title: `${getAboutContent(locale).title} · Chavrusa Link` };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <ProseDocument doc={getAboutContent(locale)} />;
}
