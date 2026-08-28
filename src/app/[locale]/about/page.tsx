import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import ProseDocument from "@/components/ProseDocument";
import ImageSlot from "@/components/ImageSlot";
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

  return (
    <>
      <div className="mx-auto w-full max-w-2xl px-4 pt-12">
        <ImageSlot
          direction="Beis medrash — shtenders and seforim, no faces"
          src="/photos/p6-beis-medrash.jpg"
          alt=""
          height={330}
        />
      </div>

      <ProseDocument doc={getAboutContent(locale)} />

      {/* One image, full width. The shelf photograph is a 3.7:1 panorama,
          so a half-column showed barely a third of the row of spines; at
          full width it shows most of it, which is the whole point of the
          shot. */}
      <div className="mx-auto w-full max-w-2xl px-4">
        <ImageSlot
          direction="A set of seforim on a shelf"
          src="/photos/p2-seforim-shelf.jpg"
          alt=""
          height={240}
        />
      </div>
    </>
  );
}
