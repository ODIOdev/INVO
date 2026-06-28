import { NextResponse } from "next/server";
import type { DraftState } from "@/lib/drafts";
import {
  buildInvoiceEmailSubject,
  hasResendConfig,
  hasSmtpConfig,
  sendInvoiceViaResend,
  sendInvoiceViaSmtp,
} from "@/lib/invoice-email-server";
import { createInvoicePaymentUrl } from "@/lib/stripe-checkout";

export async function POST(request: Request) {
  const body = await request.json();
  const state = body.state as DraftState | undefined;
  const to = typeof body.to === "string" ? body.to.trim() : "";

  if (!state?.client || !to) {
    return NextResponse.json(
      { error: "A valid invoice and recipient email are required." },
      { status: 400 }
    );
  }

  const subject = buildInvoiceEmailSubject(state);

  try {
    if (hasResendConfig()) {
      await sendInvoiceViaResend(state, to);
      return NextResponse.json({ mode: "sent", to, subject });
    }

    if (hasSmtpConfig()) {
      await sendInvoiceViaSmtp(state, to);
      return NextResponse.json({ mode: "sent", to, subject });
    }

    const paymentUrl = await createInvoicePaymentUrl(state, to).catch(() => null);

    return NextResponse.json({
      mode: "compose",
      to,
      subject,
      paymentUrl,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to send email";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
