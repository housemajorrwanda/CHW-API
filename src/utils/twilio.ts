import Twilio from "twilio";

function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new Error(
      "Twilio credentials not configured (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN)",
    );
  }

  return Twilio(accountSid, authToken);
}

/**
 * Send a verification (OTP) using Twilio Verify service.
 * Requires TWILIO_VERIFY_SERVICE_SID in env.
 * Returns the verification object from Twilio.
 */
export async function sendVerificationSms(
  to: string,
  channel: "sms" | "call" = "sms",
) {
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
  if (!serviceSid) {
    throw new Error("TWILIO_VERIFY_SERVICE_SID is not configured");
  }

  const client = getTwilioClient();
  return client.verify.v2
    .services(serviceSid)
    .verifications.create({ to, channel });
}

/**
 * Check a verification code (OTP) previously sent via Verify service.
 * Returns the verification check object from Twilio.
 */
export async function checkVerificationCode(to: string, code: string) {
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
  if (!serviceSid) {
    throw new Error("TWILIO_VERIFY_SERVICE_SID is not configured");
  }

  const client = getTwilioClient();
  return client.verify.v2
    .services(serviceSid)
    .verificationChecks.create({ to, code });
}

/**
 * Send a plain SMS message using Twilio Messages API.
 * Configuration options (in order of precedence):
 *  - explicit `from` argument
 *  - TWILIO_FROM_NUMBER environment variable (a Twilio phone number)
 *  - TWILIO_MESSAGING_SERVICE_SID environment variable (must start with 'MG')
 * If TWILIO_MESSAGING_SERVICE_SID contains a phone number (starts with '+' or digits),
 * it will be treated as a `from` number.
 */
export async function sendSmsMessage(to: string, body: string, from?: string) {
  const client = getTwilioClient();
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
  const fromEnv = process.env.TWILIO_FROM_NUMBER;

  const params: Record<string, unknown> = { to, body };

  if (from) {
    params.from = from;
  } else if (fromEnv) {
    params.from = fromEnv;
  } else if (messagingServiceSid) {
    // If it looks like a Messaging Service SID use it as such
    if (messagingServiceSid.startsWith("MG")) {
      params.messagingServiceSid = messagingServiceSid;
    } else {
      // fall back to using it as a from phone number (handles misconfigured env values)
      params.from = messagingServiceSid;
    }
  } else {
    throw new Error(
      "TWILIO_MESSAGING_SERVICE_SID or TWILIO_FROM_NUMBER (or explicit from) must be configured",
    );
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await client.messages.create(params as any);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    throw new Error(`Twilio sendSmsMessage failed: ${errorMessage}`);
  }
}
