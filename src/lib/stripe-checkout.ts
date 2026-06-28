import Stripe from "stripe";
import { calculateDraftTotals, type DraftState } from "@/lib/drafts";

function getPublicAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL?.trim()) {
    return process.env.NEXT_PUBLIC_APP_URL.trim().replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL?.trim()) {
    return `https://${process.env.VERCEL_URL.trim()}`;
  }
  return "http://localhost:3000";
}

export function hasStripeConfig(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

function getStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new Error("Stripe is not configured");
  }
  return new Stripe(key);
}

export async function createInvoicePaymentUrl(
  state: DraftState,
  customerEmail: string
): Promise<string | null> {
  if (!hasStripeConfig()) return null;

  const totals = calculateDraftTotals(state);
  const amountCents = Math.round(totals.balanceDue * 100);
  if (amountCents < 50) return null;

  const { client, docType } = state;
  const projectName = (client.projectName ?? "").trim() || "Invoice";
  const docNumber = client.documentNumber || "Invoice";
  const email = customerEmail.trim() || (client.email ?? "").trim();

  const stripe = getStripeClient();
  const baseUrl = getPublicAppUrl();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: email || undefined,
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `${docType} ${docNumber}`,
            description: projectName,
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      },
    ],
    metadata: {
      documentNumber: docNumber,
      docType,
      projectName,
      clientEmail: email,
    },
    success_url: `${baseUrl}/invoice/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/invoice/payment/cancelled?doc=${encodeURIComponent(docNumber)}`,
  });

  return session.url ?? null;
}

export function buildInvoicePaymentLink(
  state: DraftState,
  customerEmail: string
): string | null {
  if (!hasStripeConfig()) return null;

  const totals = calculateDraftTotals(state);
  if (totals.balanceDue < 0.5) return null;

  const { client, docType } = state;
  const to = customerEmail.trim() || (client.email ?? "").trim();
  if (!to) return null;

  const params = new URLSearchParams({
    to,
    amount: String(totals.balanceDue),
    doc: client.documentNumber || "Invoice",
    project: (client.projectName ?? "").trim() || "Over Drive OS",
    docType,
  });

  return `${getPublicAppUrl()}/api/stripe/pay?${params.toString()}`;
}
