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

  // A function, not a rendered array: the two copies need their own
  // elements, and reaching into a rendered element's key to re-wrap it is
  // the kind of thing that works until React decides it shouldn't.
  const renderLinks = (wrap?: (node: React.ReactNode, key: string) => React.ReactNode) =>
    links.map((link) => {
      const node = (
        <Link
          key={link.href}
          href={link.href}
          className={`${linkClass} flex items-center gap-2`}
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
      );
      return wrap ? wrap(node, link.href) : node;
    });

  return (
    // A hairline, not a shadow or a tinted bar: the design uses elevation
    // only for the modal layer.
    <header className="sticky top-0 z-20 border-b border-border bg-background">
      <nav className="relative mx-auto flex max-w-[1240px] items-center gap-8 px-6 py-4 sm:px-14 xl:py-5">
        {/* Wordmark pushed left, everything else trailing it. */}
        <Link href="/" className="me-auto flex items-center gap-3 text-[21px]">
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

          A <details> rather than a client component: this is a disclosure
          widget the browser already knows how to build, it needs no
          JavaScript, and it keeps the whole nav a server component.

          The switch is at xl, not lg: French is the longest of the four
          languages and still wrapped to two rows at 1024px, which is the
          same defect one breakpoint up. The menu has to cover the widest
          screen that any language wraps on, not the narrowest.
        */}
        <details className="group xl:hidden">
          <summary
            className="flex size-10 cursor-pointer list-none items-center justify-center border border-border"
            aria-label={t("menu")}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
              strokeLinecap="round"
              className="size-5"
              aria-hidden="true"
            >
              <g className="group-open:hidden">
                <path d="M4 7h16" />
                <path d="M4 12h16" />
                <path d="M4 17h16" />
              </g>
              <g className="hidden group-open:block">
                <path d="M6 6l12 12" />
                <path d="M18 6L6 18" />
              </g>
            </svg>
          </summary>

          {/* Anchored to the bar, not to the button inside it: hung off
              the <details> it inherited the nav's own padding and sat a
              few pixels off the screen edge. inset-x-0 rather than a side,
              so it needs no mirroring in Hebrew. */}
          <div className="absolute inset-x-0 top-full z-20 flex flex-col gap-1 border-b border-border bg-background px-6 py-4 sm:px-14">
            {renderLinks((node, key) => (
              <div key={key} className="py-2">
                {node}
              </div>
            ))}

            {signedIn ? (
              <div className="py-2">
                <LogoutButton />
              </div>
            ) : (
              /* Full width and on its own line, so the primary action
                 carries the same weight whatever the language — the one
                 thing wrapping could never guarantee. */
              <Link
                href="/signup"
                className="mt-2 bg-primary px-5 py-3 text-center text-[15px] font-semibold text-primary-foreground hover:bg-slate-600"
              >
                {t("signup")}
              </Link>
            )}

            <div className="mt-3">
              <LocaleSwitcher />
            </div>
          </div>
        </details>
      </nav>
    </header>
  );
}
