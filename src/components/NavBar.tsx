import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import LocaleSwitcher from "./LocaleSwitcher";
import LogoutButton from "./LogoutButton";
import NavMenu from "./NavMenu";
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

  /**
   * The links, written once and rendered twice — inline on a wide screen,
   * inside the menu on a narrow one. Only one copy is ever displayed, so
   * only one is ever in the accessibility tree.
   */
  const links = signedIn
    ? [
        { href: "/browse", label: t("browse") },
        { href: "/requests", label: t("requests"), badge: unreadMessages },
        { href: "/profile", label: t("profile") },
        ...(isAdmin ? [{ href: "/admin", label: t("admin") }] : []),
      ]
    : [
        { href: "/browse", label: t("browse") },
        // "How it works" is a homepage section, not a route.
        { href: "/#how", label: t("howItWorks") },
        { href: "/about", label: t("about") },
        { href: "/login", label: t("login") },
      ];

  /**
   * Inside the menu the links are chips — a pale slate fill, square like
   * everything else in this design — so the four of them read as one group
   * sitting in the bar rather than as loose text under the wordmark.
   */
  const chipClass =
    "bg-slate-100 px-3 py-1.5 text-[15px] text-slate-700 hover:bg-slate-200";

  const renderLinks = (variant: "bar" | "menu" = "bar") =>
    links.map((link) => (
      <Link
        key={link.href}
        href={link.href}
        className={`${variant === "menu" ? chipClass : linkClass} flex items-center gap-2`}
      >
        {link.label}
        {!!link.badge && link.badge > 0 && (
          <span
            className="bg-brass-tint px-1.5 text-[12px] text-brass-deep"
            aria-label={t("unreadMessages", { count: link.badge })}
          >
            {link.badge}
          </span>
        )}
      </Link>
    ));

  return (
    // A hairline, not a shadow or a tinted bar: the design uses elevation
    // only for the modal layer.
    <header className="sticky top-0 z-20 border-b border-border bg-background">
      <nav className="relative mx-auto flex max-w-[1240px] items-center gap-8 px-6 py-4 sm:px-14 xl:py-5">
        {/* Wordmark pushed left, everything else trailing it. */}
        <Link
          href="/"
          className="me-auto flex shrink-0 items-center gap-3 whitespace-nowrap text-[21px] sm:me-0 xl:me-auto"
        >
          <Logo className="size-[30px] xl:size-[34px]" />
          {common("appName")}
        </Link>

        {/* ── Wide screens: everything on the one row ──────────────── */}
        <div className="hidden items-center gap-6 xl:flex">
          {renderLinks()}
          {signedIn ? (
            <LogoutButton />
          ) : (
            <Link
              href="/signup"
              className="bg-primary px-5 py-2.5 text-[15px] font-semibold text-primary-foreground hover:bg-slate-600"
            >
              {t("signup")}
            </Link>
          )}
          <LocaleSwitcher />
        </div>

        {/*
          ── Narrow screens: one row and a menu ─────────────────────────

          The links used to wrap instead, which cost four rows and 252px
          of a 640px phone in French — the header alone was a third of the
          screen before anything else loaded, and the sign-up button
          landed wherever the wrapping left it, which is why it looked
          like a different button in every language.

          Still a <details> underneath — the browser builds the disclosure
          and it works unhydrated. NavMenu is the thin client wrapper that
          closes it again once a link is picked; everything here stays a
          server component.

          The switch is at xl, not lg: French is the longest of the four
          languages and still wrapped to two rows at 1024px, which is the
          same defect one breakpoint up. The menu has to cover the widest
          screen that any language wraps on, not the narrowest.
        */}
        <NavMenu label={t("menu")}>
          {/* The links are their own group, so the gap that separates
              them from the language picker stays a little wider than the
              gap between the chips themselves — just enough that the
              picker doesn't read as a fifth link. */}
          <div className="flex flex-wrap items-center gap-2">
            {renderLinks("menu")}
            {signedIn && <LogoutButton className={chipClass} />}
          </div>

          {signedIn ? null : (
            /* Full width on a phone, where it's the one line of the menu
               that should carry weight; in the bar it sits in the row
               with everything else. */
            <Link
              href="/signup"
              className="w-full bg-primary px-5 py-1.5 text-center text-[15px] font-semibold text-primary-foreground hover:bg-slate-600 sm:w-auto"
            >
              {t("signup")}
            </Link>
          )}

          <LocaleSwitcher />
        </NavMenu>
      </nav>
    </header>
  );
}
