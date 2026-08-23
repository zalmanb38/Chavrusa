import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTwilioVerifyService } from "@/lib/twilio-server";

const E164_PHONE = /^\+[1-9]\d{7,14}$/;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const phone = body?.phone;

  if (typeof phone !== "string" || !E164_PHONE.test(phone)) {
    return NextResponse.json({ error: "invalid_phone" }, { status: 400 });
  }

  // Resolved before the limiter is touched: a misconfigured server is our
  // fault, and shouldn't cost the caller any of their allowance.
  let verifyService;
  try {
    verifyService = getTwilioVerifyService();
  } catch (err) {
    const message = err instanceof Error ? err.message : "twilio_unconfigured";
    console.error("send-code: Twilio not configured", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  // Checked and recorded before we call Twilio, so a caller can't burn
  // messages by racing the limiter — an attempt that is refused here never
  // reaches the (billed) send below.
  const { data: gate, error: gateError } = await supabase.rpc(
    "record_phone_verification_attempt",
    { target_phone: phone },
  );

  if (gateError) {
    // Fail closed: without a working limiter every request is a billable
    // SMS, so a broken gate must not become an open one. Report the
    // underlying reason though — a bare "rate_limit_unavailable" is
    // indistinguishable from Twilio being down, which cost an afternoon.
    console.error("send-code: rate limit RPC failed", gateError);
    return NextResponse.json(
      { error: `rate_limit_unavailable: ${gateError.message}` },
      { status: 500 },
    );
  }

  const decision = gate as {
    allowed: boolean;
    reason?: string;
    retry_after_seconds?: number;
    attempt_id?: string;
  };

  if (!decision?.allowed) {
    const retryAfter = decision?.retry_after_seconds ?? 3600;
    return NextResponse.json(
      { error: decision?.reason ?? "rate_limited", retryAfterSeconds: retryAfter },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  try {
    await verifyService.verifications.create({ to: phone, channel: "sms" });
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "twilio_error";
    console.error("send-code: Twilio call failed", err);

    // Give the attempt back only when Twilio rejected the request outright.
    // A 4xx means it was refused before sending, so nothing was billed and
    // charging the caller for it is unfair. A 5xx or a network failure is
    // ambiguous — the message may well have gone out — so those keep the
    // attempt rather than risk handing out a free retry on a real send.
    const status = (err as { status?: unknown })?.status;
    const rejectedOutright =
      typeof status === "number" && status >= 400 && status < 500;

    if (rejectedOutright && decision.attempt_id) {
      const { error: refundError } = await supabase.rpc(
        "refund_phone_verification_attempt",
        { attempt_id: decision.attempt_id },
      );
      if (refundError) {
        console.error("send-code: attempt refund failed", refundError);
      }
    }

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
