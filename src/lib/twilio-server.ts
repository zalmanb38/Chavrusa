import twilio from "twilio";

const REQUIRED = [
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_VERIFY_SERVICE_SID",
] as const;

// Twilio's identifiers carry fixed prefixes. Checking them catches a
// value pasted into the wrong field — which otherwise surfaces much later
// as an opaque authentication or not-found error from the API.
const EXPECTED_PREFIX: Partial<Record<(typeof REQUIRED)[number], string>> = {
  TWILIO_ACCOUNT_SID: "AC",
  TWILIO_VERIFY_SERVICE_SID: "VA",
};

/**
 * Constructed lazily (per-request), not at module load, so the build
 * doesn't require Twilio env vars to be present.
 *
 * Failures name the specific variable at fault: "not configured" alone
 * can't distinguish a missing name from an empty value from a value in
 * the wrong field, and each has a different fix.
 */
export function getTwilioVerifyService() {
  const problems: string[] = [];
  const values: Record<string, string> = {};

  for (const name of REQUIRED) {
    const raw = process.env[name];

    if (raw === undefined) {
      problems.push(`${name} is not set`);
      continue;
    }

    // Trimmed because a value pasted with a trailing newline is "set" but
    // fails against the API, which reads as a wrong secret rather than a
    // malformed one.
    const value = raw.trim();

    if (value.length === 0) {
      problems.push(`${name} is set but empty`);
      continue;
    }

    const prefix = EXPECTED_PREFIX[name];
    if (prefix && !value.startsWith(prefix)) {
      problems.push(
        `${name} should start with "${prefix}" but starts with "${value.slice(0, 2)}"`,
      );
      continue;
    }

    values[name] = value;
  }

  if (problems.length > 0) {
    throw new Error(`Twilio configuration problem: ${problems.join("; ")}`);
  }

  return twilio(
    values.TWILIO_ACCOUNT_SID,
    values.TWILIO_AUTH_TOKEN,
  ).verify.v2.services(values.TWILIO_VERIFY_SERVICE_SID);
}
