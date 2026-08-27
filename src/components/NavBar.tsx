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
  unreadMessages,
}: {
  signedIn: boolean;
  isAdmin: boolean;
  unreadMessages: number;
}) {
  const t = await getTranslations("Nav");
  const common = await getTranslations("Common");

  const linkClass = "text-[15px] hover:text-slate-600 hover:underline";

  return (
    // A hairline, not a shadow or a tinted bar: the design uses elevation
    // only for the modal layer.
    <header className="sticky top-0 z-10 border-b border-border bg-background">
      <nav className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-8 px-6 py-5 sm:px-14">
        {/* Wordmark pushed left, everything else trailing it. */}
        <Link href="/" className="me-auto flex items-center gap-3 text-[21px]">
          <Logo className="size-[34px]" />
          {common("appName")}
        </Link>

        <div className="flex flex-wrap items-center gap-6">
          <Link href="/browse" className={linkClass}>
            {t("browse")}
          </Link>

          {signedIn ? (
            <>
              <Link href="/requests" className={`${linkClass} flex items-center gap-2`}>
                {t("requests")}
                {unreadMessages > 0 && (
                  <span
                    className="bg-brass-tint px-1.5 text-[12px] text-brass-deep"
                    aria-label={t("unreadMessages", { count: unreadMessages })}
                  >
                    {unreadMessages}
                  </span>
                )}
              </Link>
              <Link href="/profile" className={linkClass}>
                {t("profile")}
              </Link>
              {isAdmin && (
                <Link href="/admin" className={linkClass}>
                  {t("admin")}
                </Link>
              )}
              <LogoutButton />
            </>
          ) : (
            <>
              {/* "How it works" is a homepage section, not a route. */}
              <Link href="/#how" className={linkClass}>
                {t("howItWorks")}
              </Link>
              <Link href="/about" className={linkClass}>
                {t("about")}
              </Link>
              <Link href="/login" className={linkClass}>
                {t("login")}
              </Link>
              <Link
                href="/signup"
                className="bg-primary px-5 py-2.5 text-[15px] font-semibold text-primary-foreground hover:bg-slate-600"
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
