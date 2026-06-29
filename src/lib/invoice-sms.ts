import {
  calculateDraftTotals,
  formatMoney,
  type DraftState,
} from "@/lib/drafts";

function formatDisplayDate(value: string): string {
  if (!value) return "—";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function phoneDigitsForSms(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    digits = digits.slice(1);
  }
  return digits.length === 10 ? digits : "";
}

export function buildInvoiceSmsMessage(
  state: DraftState,
  options?: { paymentUrl?: string | null }
): string {
  const { docType, client } = state;
  const totals = calculateDraftTotals(state);
  const amountDue =
    docType === "Invoice" ? totals.balanceDue : totals.grandTotal;
  const greeting =
    client.clientName.trim() || client.companyName.trim() || "there";
  const project = client.projectName.trim();
  const projectPart = project ? ` for ${project}` : "";

  let message = `Hi ${greeting}, your ${docType} ${client.documentNumber}${projectPart} from Over Drive OS is ready. ${docType === "Invoice" ? "Amount due" : "Total"}: ${formatMoney(amountDue)}. Due ${formatDisplayDate(client.dueDate)}.`;

  if (
    docType === "Invoice" &&
    options?.paymentUrl &&
    totals.balanceDue >= 0.5
  ) {
    message += ` Pay online: ${options.paymentUrl}`;
  }

  return message;
}

export async function sendInvoiceSms(
  state: DraftState,
  toPhone?: string
): Promise<{ to: string; sid: string; paymentIncluded: boolean }> {
  const to = (toPhone ?? state.client.phone ?? "").trim();
  if (!to) {
    throw new Error("Enter a client phone number to send SMS.");
  }

  const response = await fetch("/api/sms/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state, to }),
  });

  const data = (await response.json().catch(() => ({}))) as {
    error?: string;
    to?: string;
    sid?: string;
    paymentIncluded?: boolean;
  };

  if (!response.ok) {
    throw new Error(data.error || "Failed to send SMS");
  }

  return {
    to: data.to ?? to,
    sid: data.sid ?? "",
    paymentIncluded: Boolean(data.paymentIncluded),
  };
}
