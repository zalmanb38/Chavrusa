import type { Metadata } from "next";
import { Assistant, Frank_Ruhl_Libre } from "next/font/google";
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

// Chosen with Hebrew in mind: both have real Hebrew glyphs (unlike the
// previous Geist fonts), so `/he` renders with matching type instead of
// silently falling back to a mismatched system font.
const assistant = Assistant({
  variable: "--font-sans",
  subsets: ["latin", "hebrew"],
  weight: ["400", "500", "600", "700"],
});

const frankRuhlLibre = Frank_Ruhl_Libre({
  variable: "--font-serif",
  subsets: ["latin", "hebrew"],
  weight: ["500", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Chavrusa Link",
  description: "Find a Torah study partner — remote or in person.",
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
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin, suspended")
      .eq("id", user.id)
      .maybeSingle();
    isAdmin = profile?.is_admin ?? false;
    suspended = profile?.suspended ?? false;
  }

  const t = await getTranslations("Common");

  return (
    <html
      lang={locale}
      dir={isRtl(locale) ? "rtl" : "ltr"}
      className={`${assistant.variable} ${frankRuhlLibre.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <NextIntlClientProvider locale={locale as Locale}>
          <NavBar signedIn={Boolean(user)} isAdmin={isAdmin} />
          <main className="flex-1">
            {suspended ? (
              <div className="mx-auto flex max-w-md flex-col gap-3 px-4 py-24 text-center">
                <h1 className="font-serif text-2xl font-medium">
                  {t("suspendedTitle")}
                </h1>
                <p className="text-sm text-muted">{t("suspendedBody")}</p>
                <Link
                  href="/contact"
                  className="mx-auto w-fit rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
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
