import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/admin";
import AdminNav from "@/components/AdminNav";
import AdminMessageActions from "@/components/AdminMessageActions";

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  topic: string;
  message: string;
  user_id: string | null;
  handled: boolean;
  created_at: string;
}

export default async function AdminMessagesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Admin");
  const tContact = await getTranslations("Contact");
  const { supabase } = await requireAdmin(locale);

  const { data } = await supabase
    .from("contact_messages")
    .select("id, name, email, topic, message, user_id, handled, created_at")
    // Unhandled first, then newest — the queue should open on what's left
    // to do, not on whatever arrived most recently.
    .order("handled", { ascending: true })
    .order("created_at", { ascending: false });

  const messages = (data ?? []) as ContactMessage[];
  const openCount = messages.filter((m) => !m.handled).length;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-12">
      <div className="flex flex-col gap-4">
        <h1 className="font-serif text-3xl font-medium">{t("messagesTitle")}</h1>
        <AdminNav />
      </div>

      <p className="text-sm text-muted">
        {t("messagesOpenCount", { count: openCount })}
      </p>

      {messages.length === 0 ? (
        <p className="text-sm text-muted">{t("noMessages")}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {messages.map((m) => (
            <li
              key={m.id}
              className={`flex flex-col gap-2 rounded-2xl border bg-surface p-4 shadow-sm ${
                m.handled ? "border-border opacity-60" : "border-primary/50"
              }`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm">
                  <span className="font-medium">{m.name}</span>{" "}
                  <a
                    href={`mailto:${m.email}`}
                    className="text-muted underline"
                    dir="ltr"
                  >
                    {m.email}
                  </a>
                </p>
                <time className="text-xs text-muted" dateTime={m.created_at}>
                  {new Date(m.created_at).toLocaleString(locale)}
                </time>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span
                  className={`rounded-full border px-2 py-0.5 ${
                    m.topic === "safety"
                      ? "border-red-600/40 text-red-600"
                      : "border-border text-muted"
                  }`}
                >
                  {tContact(`topic_${m.topic}`)}
                </span>
                {m.handled && (
                  <span className="rounded-full border border-border px-2 py-0.5 text-muted">
                    {t("handledBadge")}
                  </span>
                )}
                {m.user_id && (
                  <Link
                    href={`/admin/profiles/${m.user_id}`}
                    className="rounded-full border border-border px-2 py-0.5 text-muted underline"
                  >
                    {t("viewSenderProfile")}
                  </Link>
                )}
              </div>

              <p className="text-sm whitespace-pre-wrap">{m.message}</p>

              <AdminMessageActions messageId={m.id} handled={m.handled} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
