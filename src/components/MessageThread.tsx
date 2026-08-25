"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import ErrorNote from "@/components/ErrorNote";
import { MAX_MESSAGE_LENGTH, type Message } from "@/lib/messages";

/**
 * The conversation on a match page.
 *
 * Messages arrive rendered from the server; this adds sending, and marks
 * the thread read on open. There is no polling — a chavrusa conversation
 * is a handful of messages about when to learn, not a live chat, and a
 * refresh loop on every open match page would cost far more than it gives.
 */
export default function MessageThread({
  requestId,
  initialMessages,
  viewerId,
  partnerName,
}: {
  requestId: string;
  initialMessages: Message[];
  viewerId: string;
  partnerName: string;
}) {
  const t = useTranslations("Messages");
  const router = useRouter();

  const [messages, setMessages] = useState(initialMessages);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const markedRef = useRef(false);

  const hasUnread = initialMessages.some(
    (m) => m.sender_id !== viewerId && m.read_at === null,
  );

  useEffect(() => {
    // Once per mount, and only when there is something to mark — a POST on
    // every visit to a fully-read thread is pure noise.
    if (markedRef.current || !hasUnread) return;
    markedRef.current = true;

    fetch("/api/messages/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId }),
    })
      .then(() => router.refresh())
      .catch(() => {
        // A failed read-marker is not worth interrupting anyone over; the
        // badge simply stays until the next visit.
      });
  }, [hasUnread, requestId, router]);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;

    setSending(true);
    setError(null);

    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, body: trimmed }),
      });

      if (!response.ok) {
        setError(t("sendFailed"));
        return;
      }

      const json = await response.json().catch(() => ({}));
      // Shown immediately rather than waiting on a refresh; the server
      // copy replaces it on the next render.
      setMessages((prev) => [
        ...prev,
        {
          id: json.id ?? `pending-${Date.now()}`,
          connect_request_id: requestId,
          sender_id: viewerId,
          body: trimmed,
          created_at: new Date().toISOString(),
          read_at: null,
        },
      ]);
      setBody("");
      router.refresh();
    } catch {
      setError(t("sendFailed"));
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="flex flex-col gap-4 border-t border-border pt-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-[11.5px] tracking-[0.14em] text-muted uppercase">
          {t("title")}
        </h2>
        <p className="text-xs text-muted">{t("hint")}</p>
      </div>

      {messages.length === 0 ? (
        <p className="text-sm text-muted">
          {t("empty", { name: partnerName })}
        </p>
      ) : (
        <ol className="flex flex-col gap-3">
          {messages.map((message) => {
            const mine = message.sender_id === viewerId;
            return (
              <li
                key={message.id}
                className={`flex flex-col gap-1 ${mine ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[34em] px-3.5 py-2.5 text-[15px] whitespace-pre-wrap ${
                    mine
                      ? "bg-primary text-primary-foreground"
                      : "bg-surface"
                  }`}
                >
                  {message.body}
                </div>
                <span className="text-[11px] text-muted">
                  {new Date(message.created_at).toLocaleString()}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      <form onSubmit={send} className="flex flex-col gap-2">
        <label htmlFor="message-body" className="sr-only">
          {t("composerLabel")}
        </label>
        <textarea
          id="message-body"
          value={body}
          rows={3}
          maxLength={MAX_MESSAGE_LENGTH}
          placeholder={t("composerPlaceholder")}
          onChange={(e) => setBody(e.target.value)}
          className="border border-border bg-transparent px-3.5 py-2.5 text-sm focus:border-primary focus:outline-none"
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] text-muted">
            {body.length}/{MAX_MESSAGE_LENGTH}
          </span>
          <button
            type="submit"
            disabled={sending || body.trim().length === 0}
            className="bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-45"
          >
            {sending ? t("sending") : t("send")}
          </button>
        </div>
        {error && <ErrorNote>{error}</ErrorNote>}
      </form>
    </section>
  );
}
