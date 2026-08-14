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

  try {
    const verifyService = getTwilioVerifyService();
    await verifyService.verifications.create({ to: phone, channel: "sms" });
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "twilio_error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
