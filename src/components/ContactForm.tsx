"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

const TOPICS = ["general", "safety", "technical", "feedback"] as const;

const fieldClass =
  "rounded-xl border border-border bg-transparent px-3.5 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none";

export default function ContactForm() {
  const t = useTranslations("Contact");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState<(typeof TOPICS)[number]>("general");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot

  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSending(true);

    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, topic, message, website }),
    });
    const data = await res.json().catch(() => ({}));
    setSending(false);

    if (!res.ok) {
      setError(
        res.status === 429
          ? t("rateLimited")
          : data.error === "invalid_input"
            ? t("invalidInput")
            : t("sendError"),
      );
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <div className="rounded-2xl border border-accent/40 bg-accent/10 p-6">
        <p className="font-medium">{t("successTitle")}</p>
        <p className="mt-1 text-sm text-muted">{t("successBody")}</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6 shadow-sm"
    >
      <label className="flex flex-col gap-1.5 text-sm">
        {t("nameLabel")}
        <input
          type="text"
          required
          maxLength={200}
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={fieldClass}
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        {t("emailLabel")}
        <input
          type="email"
          required
          maxLength={320}
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={fieldClass}
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        {t("topicLabel")}
        <select
          value={topic}
          onChange={(e) =>
            setTopic(e.target.value as (typeof TOPICS)[number])
          }
          className={fieldClass}
        >
          {TOPICS.map((key) => (
            <option key={key} value={key}>
              {t(`topic_${key}`)}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        {t("messageLabel")}
        <textarea
          required
          rows={6}
          maxLength={5000}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className={fieldClass}
        />
      </label>

      {/* Honeypot: hidden from people, tempting to bots that fill every
          input they find. Submissions carrying it are silently discarded.
          aria-hidden + tabIndex keep it away from screen readers and the
          keyboard, so it never traps a real user. */}
      <div aria-hidden="true" className="hidden">
        <label>
          Website
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </label>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={sending}
        className="w-fit rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
      >
        {sending ? t("sending") : t("submit")}
      </button>
    </form>
  );
}
