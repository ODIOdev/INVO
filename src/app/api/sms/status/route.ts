import { NextResponse } from "next/server";
import {
  hasTwilioConfig,
  normalizeTwilioAccountSid,
} from "@/lib/invoice-sms-server";

export async function GET() {
  const accountSid = normalizeTwilioAccountSid(
    process.env.TWILIO_ACCOUNT_SID?.trim() ?? ""
  );
  const hasAuthToken = Boolean(process.env.TWILIO_AUTH_TOKEN?.trim());
  const hasFromNumber = Boolean(process.env.TWILIO_PHONE_NUMBER?.trim());
  const hasMessagingService = Boolean(
    process.env.TWILIO_MESSAGING_SERVICE_SID?.trim()
  );

  return NextResponse.json({
    configured: hasTwilioConfig(),
    hasAccountSid: Boolean(accountSid),
    hasAuthToken,
    hasSender: hasFromNumber || hasMessagingService,
    fromNumber: process.env.TWILIO_PHONE_NUMBER?.trim() || null,
  });
}
