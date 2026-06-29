import { NextResponse } from "next/server";
import type { DraftState } from "@/lib/drafts";
import {
  hasTwilioConfig,
  sendInvoiceSmsServer,
} from "@/lib/invoice-sms-server";

export async function POST(request: Request) {
  const body = await request.json();
  const state = body.state as DraftState | undefined;
  const to =
    typeof body.to === "string"
      ? body.to.trim()
      : (state?.client?.phone ?? "").trim();

  if (!state?.client) {
    return NextResponse.json(
      { error: "A valid invoice or quote is required." },
      { status: 400 }
    );
  }

  if (!to) {
    return NextResponse.json(
      { error: "Enter a client phone number to send SMS." },
      { status: 400 }
    );
  }

  if (!hasTwilioConfig()) {
    return NextResponse.json(
      {
        error:
          "SMS is not configured. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER to your environment variables.",
        setupUrl: "https://console.twilio.com/",
      },
      { status: 503 }
    );
  }

  try {
    const result = await sendInvoiceSmsServer(state, to);
    return NextResponse.json({
      to: result.to,
      sid: result.sid,
      paymentIncluded: result.paymentIncluded,
      docType: state.docType,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to send SMS";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
