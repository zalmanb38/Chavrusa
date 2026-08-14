import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import LocaleSwitcher from "./LocaleSwitcher";
import LogoutButton from "./LogoutButton";
import Logo from "./Logo";

// Auth state is resolved once in the locale layout and passed down, so the
// nav doesn't repeat the same profile query on every page render.
export default async function NavBar({
  signedIn,
  isAdmin,
}: {
  signedIn: boolean;
  isAdmin: boolean;
}) {
  const t = await getTranslations("Nav");
  const common = await getTranslations("Common");

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
      <nav className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-4">
        <Link href="/" className="flex items-center gap-2 font-serif text-lg font-medium">
          <Logo className="size-7" />
          {common("appName")}
        </Link>

        <div className="flex flex-wrap items-center gap-5">
          <Link
            href="/browse"
            className="text-sm text-foreground/80 hover:text-foreground"
          >
            {t("browse")}
          </Link>

          {signedIn ? (
            <>
              <Link
                href="/requests"
                className="text-sm text-foreground/80 hover:text-foreground"
              >
                {t("requests")}
              </Link>
              <Link
                href="/profile"
                className="text-sm text-foreground/80 hover:text-foreground"
              >
                {t("profile")}
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  className="text-sm text-foreground/80 hover:text-foreground"
                >
                  {t("admin")}
                </Link>
              )}
              <LogoutButton />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm text-foreground/80 hover:text-foreground"
              >
                {t("login")}
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                {t("signup")}
              </Link>
            </>
          )}

          <LocaleSwitcher />
        </div>
      </nav>
    </header>
  );
}
