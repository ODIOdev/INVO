import twilio from "twilio";
import type { DraftState } from "@/lib/drafts";
import {
  buildInvoiceSmsMessage,
  phoneDigitsForSms,
} from "@/lib/invoice-sms";

export function normalizeTwilioAccountSid(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith("US") && trimmed.length === 34) {
    return `AC${trimmed.slice(2)}`;
  }
  return trimmed;
}

function getTwilioAccountSid(): string {
  const raw = process.env.TWILIO_ACCOUNT_SID?.trim() ?? "";
  return normalizeTwilioAccountSid(raw);
}

export function hasTwilioConfig(): boolean {
  const accountSid = getTwilioAccountSid();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const fromNumber = process.env.TWILIO_PHONE_NUMBER?.trim();
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID?.trim();

  return Boolean(
    accountSid && authToken && (fromNumber || messagingServiceSid)
  );
}

function getTwilioClient() {
  const accountSid = getTwilioAccountSid();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();

  if (!accountSid || !authToken) {
    throw new Error("Twilio is not configured.");
  }

  return twilio(accountSid, authToken);
}

export async function sendInvoiceSmsServer(
  state: DraftState,
  toPhone?: string
): Promise<{ to: string; sid: string; paymentIncluded: boolean }> {
  const digits = phoneDigitsForSms(toPhone ?? state.client.phone ?? "");
  if (!digits) {
    throw new Error("Enter a valid 10-digit client phone number to send SMS.");
  }

  let paymentUrl: string | null = null;
  if (state.docType === "Invoice") {
    const { createInvoicePaymentUrl } = await import("@/lib/stripe-checkout");
    paymentUrl = await createInvoicePaymentUrl(
      state,
      (state.client.email ?? "").trim()
    );
  }

  const body = buildInvoiceSmsMessage(state, { paymentUrl });
  const to = `+1${digits}`;
  const client = getTwilioClient();
  const fromNumber = process.env.TWILIO_PHONE_NUMBER?.trim();
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID?.trim();

  const message = await client.messages.create({
    body,
    to,
    ...(messagingServiceSid
      ? { messagingServiceSid }
      : { from: fromNumber! }),
  });

  return {
    to,
    sid: message.sid,
    paymentIncluded: Boolean(paymentUrl),
  };
}
