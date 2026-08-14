import twilio from "twilio";

// Constructed lazily (per-request), not at module load, so the build
// doesn't require Twilio env vars to be present.
export function getTwilioVerifyService() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

  if (!accountSid || !authToken || !verifyServiceSid) {
    throw new Error("Twilio environment variables are not configured.");
  }

  return twilio(accountSid, authToken).verify.v2.services(verifyServiceSid);
}
