import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const TOPICS = ["general", "safety", "technical", "feedback"] as const;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MAX_PER_IP_PER_HOUR = 5;
const CONTACT_TO = "info@chavrusalink.com";

/**
 * Hashed with a server-side salt so the table holds no reversible record
 * of who used the form — the value is only ever compared against itself.
 */
function hashIp(ip: string): string {
  const salt = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

async function notifyByEmail(fields: {
  name: string;
  email: string;
  topic: string;
  message: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { sent: false, reason: "no_api_key" };

  const from = process.env.CONTACT_FROM_EMAIL ?? "noreply@chavrusalink.com";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `Chavrusa Link <${from}>`,
      to: [CONTACT_TO],
      // So hitting reply in the mail client answers the sender, not us.
      reply_to: fields.email,
      subject: `[${fields.topic}] Contact form — ${fields.name}`,
      text: [
        `Topic: ${fields.topic}`,
        `Name: ${fields.name}`,
        `Email: ${fields.email}`,
        "",
        fields.message,
      ].join("\n"),
    }),
  });

  return { sent: res.ok, reason: res.ok ? undefined : `resend_${res.status}` };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const topic = typeof body?.topic === "string" ? body.topic : "";
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  const honeypot = typeof body?.website === "string" ? body.website : "";

  // Honeypot: a real person never sees this field, so anything in it is a
  // bot. Answer exactly like success — telling a scraper it was caught
  // just invites a retry without the field filled in.
  if (honeypot) {
    return NextResponse.json({ success: true });
  }

  if (
    !name ||
    name.length > 200 ||
    !EMAIL.test(email) ||
    email.length > 320 ||
    !TOPICS.includes(topic as (typeof TOPICS)[number]) ||
    !message ||
    message.length > 5000
  ) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
  }

  const ipHash = hashIp(clientIp(request));

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await admin
    .from("contact_messages")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", since);

  if ((count ?? 0) >= MAX_PER_IP_PER_HOUR) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": "3600" } },
    );
  }

  // Attach the account when the sender is signed in — useful context when
  // the message is about their own profile or a safety issue.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error: insertError } = await admin.from("contact_messages").insert({
    name,
    email,
    topic,
    message,
    user_id: user?.id ?? null,
    ip_hash: ipHash,
  });

  if (insertError) {
    return NextResponse.json({ error: "store_failed" }, { status: 500 });
  }

  // Best effort: the message is already saved and visible in the admin
  // panel, so a failed notification must not read as a failed submission.
  // It does need to be visible somewhere though — a silently dropped
  // notification looks identical to one that was never attempted.
  try {
    const result = await notifyByEmail({ name, email, topic, message });
    if (!result.sent) {
      console.error(
        `contact: notification not sent (${result.reason}). Message is stored and readable at /admin/messages.`,
      );
    }
  } catch (err) {
    console.error("contact: notification threw", err);
  }

  return NextResponse.json({ success: true });
}
