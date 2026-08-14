import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import LocaleSwitcher from "./LocaleSwitcher";
import LogoutButton from "./LogoutButton";
import Logo from "./Logo";

export default async function NavBar() {
  const t = await getTranslations("Nav");
  const common = await getTranslations("Common");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();
    isAdmin = profile?.is_admin ?? false;
  }

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

          {user ? (
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
                  href="/admin/reports"
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
