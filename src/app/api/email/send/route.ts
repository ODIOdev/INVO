import { NextResponse } from "next/server";
import type { DraftState } from "@/lib/drafts";
import {
  buildInvoiceEmailSubject,
  hasEmailConfig,
  sendInvoiceEmail as sendInvoiceEmailServer,
} from "@/lib/invoice-email-server";

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

  if (!hasEmailConfig()) {
    return NextResponse.json(
      {
        error:
          "Email is not configured. Install the Resend integration on Vercel or add RESEND_API_KEY to your environment variables.",
        setupUrl: "https://vercel.com/integrations/resend",
      },
      { status: 503 }
    );
  }

  const subject = buildInvoiceEmailSubject(state);

  try {
    await sendInvoiceEmailServer(state, to);
    const { buildInvoicePaymentLink } = await import("@/lib/stripe-checkout");
    const paymentUrl =
      state.docType === "Invoice" ? buildInvoicePaymentLink(state, to) : null;
    return NextResponse.json({
      to,
      subject,
      paymentIncluded: Boolean(paymentUrl),
      docType: state.docType,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to send email";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
