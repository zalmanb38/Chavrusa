import type { Metadata } from "next";
import { Source_Serif_4, Frank_Ruhl_Libre } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import "./globals.css";
import { getTranslations } from "next-intl/server";
import { routing, isRtl, type Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/site";

// "One serif for everything, including UI chrome." Source Serif 4 carries
// Latin; it has no Hebrew glyphs, so Frank Ruhl Libre sits behind it in
// the stack rather than being applied separately.
//
// That ordering does two jobs at once. In the Hebrew locale the whole
// interface falls through to Frank Ruhl Libre automatically. And in a
// mixed run like "Gemara · בבא מציעא" each script picks up its own face
// within the same element — which is exactly what the handoff asks for,
// without needing a span around every Hebrew word.
const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  weight: ["400", "600"],
  style: ["normal", "italic"],
});

const frankRuhlLibre = Frank_Ruhl_Libre({
  variable: "--font-frank-ruhl",
  subsets: ["latin", "hebrew"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Chavrusa Link",
  description: "Find a Torah study partner — remote or in person.",
  // The share card is typographic rather than photographic, because feeds
  // crop and downscale it. English only for now: BRAND-ASSETS.md §3 asks
  // for approval on each locale's wording before localised cards exist,
  // so every locale shares this one rather than getting a machine
  // translation of it.
  openGraph: {
    type: "website",
    title: "Chavrusa Link — find someone to learn with",
    description:
      "Post what you learn and when you are free. See everyone doing the same nearby.",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Chavrusa Link — find someone to learn with",
    description:
      "Post what you learn and when you are free. See everyone doing the same nearby.",
    images: ["/og-image.png"],
  },
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  // One profile read per request, shared by the nav (admin link) and the
  // suspension gate below, so a suspended account can't keep using the app
  // by navigating straight to a URL.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  let suspended = false;
  let unreadMessages = 0;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin, suspended")
      .eq("id", user.id)
      .maybeSingle();
    isAdmin = profile?.is_admin ?? false;
    suspended = profile?.suspended ?? false;

    // A head count, so the nav badge costs a count rather than the rows.
    // RLS already limits this to threads on the reader's own accepted
    // matches, so there is nothing further to scope it by here.
    const { count } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .neq("sender_id", user.id)
      .is("read_at", null);
    unreadMessages = count ?? 0;
  }

  const t = await getTranslations("Common");

  return (
    <html
      lang={locale}
      dir={isRtl(locale) ? "rtl" : "ltr"}
      className={`${sourceSerif.variable} ${frankRuhlLibre.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <NextIntlClientProvider locale={locale as Locale}>
          <NavBar
            signedIn={Boolean(user)}
            isAdmin={isAdmin}
            unreadMessages={unreadMessages}
          />
          <main className="flex-1">
            {suspended ? (
              <div className="mx-auto flex max-w-md flex-col gap-3 px-4 py-24 text-center">
                <h1 className="font-serif text-2xl font-medium">
                  {t("suspendedTitle")}
                </h1>
                <p className="text-sm text-muted">{t("suspendedBody")}</p>
                <Link
                  href="/contact"
                  className="mx-auto w-fit rounded-sm bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
                >
                  {t("suspendedContact")}
                </Link>
              </div>
            ) : (
              children
            )}
          </main>
          {/* Outside the suspension gate: a suspended account still needs
              the contact link to appeal, and the legal pages stay
              reachable from every page for Google's OAuth review. */}
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
