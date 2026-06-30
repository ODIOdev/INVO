import { NextResponse } from "next/server";
import type { DraftState } from "@/lib/drafts";
import { createInvoicePaymentUrl } from "@/lib/stripe-checkout";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const to = searchParams.get("to")?.trim() ?? "";
  const amount = Number(searchParams.get("amount"));
  const doc = searchParams.get("doc")?.trim() || "Invoice";
  const project = searchParams.get("project")?.trim() || "Over Drive OS";
  const docType = searchParams.get("docType") === "Quote" ? "Quote" : "Invoice";

  if (!to || !Number.isFinite(amount) || amount < 0.5) {
    return NextResponse.json(
      { error: "Invalid payment link." },
      { status: 400 }
    );
  }

  const state: DraftState = {
    docType,
    taxRate: 0,
    client: {
      clientName: "",
      companyName: "",
      email: to,
      phone: "",
      url: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      zipCode: "",
      projectName: project,
      documentNumber: doc,
      issueDate: new Date().toISOString().split("T")[0],
      dueDate: new Date().toISOString().split("T")[0],
    },
    services: [
      {
        id: 1,
        service: `${docType} ${doc}`,
        description: project,
        quantity: 1,
        unitPrice: amount,
      },
    ],
    laborTitle: "",
    laborHours: 0,
    laborRate: 0,
    deposit: 0,
    notes: "",
  };

  try {
    const stripeUrl = await createInvoicePaymentUrl(state, to);
    if (!stripeUrl) {
      return NextResponse.json(
        { error: "Unable to create payment session." },
        { status: 503 }
      );
    }

    return NextResponse.redirect(stripeUrl, 302);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to start payment.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
