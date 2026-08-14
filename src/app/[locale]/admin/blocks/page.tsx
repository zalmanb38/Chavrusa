import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/admin";
import AdminNav from "@/components/AdminNav";

interface ProfileSummary {
  id: string;
  name: string;
}

interface BlockRow {
  id: string;
  created_at: string;
  blocker: ProfileSummary | null;
  blocked: ProfileSummary | null;
}

export default async function AdminBlocksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Admin");
  const { supabase } = await requireAdmin(locale);

  const { data } = await supabase
    .from("blocks")
    .select(
      "id, created_at, blocker:blocker_id(id, name), blocked:blocked_id(id, name)",
    )
    .order("created_at", { ascending: false });

  const blocks = (data ?? []) as unknown as BlockRow[];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-12">
      <div className="flex flex-col gap-4">
        <h1 className="font-serif text-3xl font-medium">{t("blocksTitle")}</h1>
        <AdminNav />
      </div>

      {blocks.length === 0 ? (
        <p className="text-sm text-muted">{t("noBlocksRecorded")}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {blocks.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-baseline justify-between gap-2 rounded-2xl border border-border bg-surface p-4 text-sm shadow-sm"
            >
              <p>
                {row.blocker ? (
                  <Link
                    href={`/admin/profiles/${row.blocker.id}`}
                    className="font-medium underline"
                  >
                    {row.blocker.name || t("unknownUser")}
                  </Link>
                ) : (
                  <span className="font-medium">{t("unknownUser")}</span>
                )}{" "}
                <span className="text-muted">{t("blockedArrow")}</span>{" "}
                {row.blocked ? (
                  <Link
                    href={`/admin/profiles/${row.blocked.id}`}
                    className="font-medium underline"
                  >
                    {row.blocked.name || t("unknownUser")}
                  </Link>
                ) : (
                  <span className="font-medium">{t("unknownUser")}</span>
                )}
              </p>
              <time className="text-xs text-muted" dateTime={row.created_at}>
                {new Date(row.created_at).toLocaleString(locale)}
              </time>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
