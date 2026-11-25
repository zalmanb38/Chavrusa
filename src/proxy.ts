import { createServerClient } from "@supabase/ssr";
import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const handleI18nRouting = createIntlMiddleware(routing);

export async function proxy(request: NextRequest) {
  // The OAuth/email-confirmation callback is a locale-agnostic route
  // handler; skip locale rewriting so the `code` query param survives.
  const isAuthCallback = request.nextUrl.pathname.startsWith("/auth/");
  const response = isAuthCallback
    ? NextResponse.next()
    : handleI18nRouting(request);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh the auth session so server components see an up-to-date user.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    // The proxy runs ahead of filesystem routes, so anything served from
    // public/ has to be excluded here or next-intl rewrites it to a
    // locale path and it 404s. That covers site-verification files,
    // robots.txt and sitemap.xml — all of which have to answer on the
    // bare domain, with no /en prefix. The typefaces in public/fonts are
    // here for the same reason, and for one of their own: a stylesheet
    // asks for a font at the path it was written with, so a redirect to
    // /en/fonts/… is not followed into a usable font — the page simply
    // falls back to Georgia with no error anywhere.
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|html|txt|xml|woff2|woff|ttf|otf)$).*)",
  ],
};
