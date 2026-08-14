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
  const code = body?.code;

  if (
    typeof phone !== "string" ||
    !E164_PHONE.test(phone) ||
    typeof code !== "string" ||
    !code
  ) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  try {
    const verifyService = getTwilioVerifyService();
    const check = await verifyService.verificationChecks.create({
      to: phone,
      code,
    });

    if (check.status !== "approved") {
      return NextResponse.json({ error: "code_incorrect" }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "twilio_error";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ phone, phone_verified: true })
    .eq("id", user.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
