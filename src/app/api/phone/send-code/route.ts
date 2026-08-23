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

  // Checked and recorded before we call Twilio, so a caller can't burn
  // messages by racing the limiter — an attempt that is refused here never
  // reaches the (billed) send below.
  const { data: gate, error: gateError } = await supabase.rpc(
    "record_phone_verification_attempt",
    { target_phone: phone },
  );

  if (gateError) {
    return NextResponse.json({ error: "rate_limit_unavailable" }, { status: 500 });
  }

  const decision = gate as {
    allowed: boolean;
    reason?: string;
    retry_after_seconds?: number;
  };

  if (!decision?.allowed) {
    const retryAfter = decision?.retry_after_seconds ?? 3600;
    return NextResponse.json(
      { error: decision?.reason ?? "rate_limited", retryAfterSeconds: retryAfter },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  try {
    const verifyService = getTwilioVerifyService();
    await verifyService.verifications.create({ to: phone, channel: "sms" });
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "twilio_error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
