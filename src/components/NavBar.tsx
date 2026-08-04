import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import LocaleSwitcher from "./LocaleSwitcher";
import LogoutButton from "./LogoutButton";

export default async function NavBar() {
  const t = await getTranslations("Nav");
  const common = await getTranslations("Common");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-10 border-b border-black/10 bg-white/90 backdrop-blur dark:border-white/10 dark:bg-black/90">
      <nav className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="text-base font-semibold">
          {common("appName")}
        </Link>

        <div className="flex flex-wrap items-center gap-4">
          <Link href="/browse" className="text-sm hover:underline">
            {t("browse")}
          </Link>

          {user ? (
            <>
              <Link href="/requests" className="text-sm hover:underline">
                {t("requests")}
              </Link>
              <Link href="/profile" className="text-sm hover:underline">
                {t("profile")}
              </Link>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm hover:underline">
                {t("login")}
              </Link>
              <Link
                href="/signup"
                className="rounded-md bg-black px-3 py-1.5 text-sm text-white dark:bg-white dark:text-black"
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
