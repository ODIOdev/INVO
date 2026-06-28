import {
  calculateDraftTotals,
  formatMoney,
  type DraftState,
} from "@/lib/drafts";

function formatDisplayDate(value: string): string {
  if (!value) return "-";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function moneyForEmail(amount: number): string {
  return formatMoney(amount).replace(/\u2212/g, "-");
}

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fieldBlock(label: string, value: string | undefined | null): string {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return "";
  return `<tr><td style="padding:0 0 10px 0;">
    <div class="email-label" style="font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">${esc(label)}</div>
    <div class="email-value" style="font-size:13px;color:#18181b;line-height:1.4;">${esc(trimmed)}</div>
  </td></tr>`;
}

function summaryRow(label: string, value: string, bold = false): string {
  return `<tr>
    <td style="padding:4px 0;font-size:13px;color:${bold ? "#27272a" : "#71717a"};font-weight:${bold ? "600" : "400"};">${esc(label)}</td>
    <td style="padding:4px 0;font-size:13px;color:#27272a;font-weight:${bold ? "600" : "500"};text-align:right;">${esc(value)}</td>
  </tr>`;
}

export type InvoiceEmailRenderOptions = {
  logoUrl?: string;
  paymentUrl?: string | null;
};

function hrefAttr(url: string): string {
  return url.replace(/"/g, "&quot;");
}

/** White background styles that resist some dark-mode inversions */
const WHITE_BG = "background-color:#ffffff;";

const EMAIL_HEAD = `<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<style type="text/css">
  body { margin:0; padding:0; }
  @media (prefers-color-scheme: dark) {
    .email-bg, .email-card, .email-panel, .email-payment { background-color:#ffffff !important; }
    .email-title, .email-value, .email-line-item, .email-payment-amount, .email-total { color:#18181b !important; }
    .email-subtitle, .email-muted { color:#71717a !important; }
    .email-label { color:#9ca3af !important; }
    .email-body-text { color:#3f3f46 !important; }
    .email-footer { color:#a1a1aa !important; }
    .email-stripe-link { color:#635bff !important; }
  }
</style>`;

function paymentCardHtml(
  paymentUrl: string,
  amountLabel: string,
  dueDateLabel: string
): string {
  const safeUrl = hrefAttr(paymentUrl);
  return `<table width="100%" cellpadding="0" cellspacing="0" class="email-payment" style="margin:28px 0;border:2px solid #635bff;border-radius:12px;${WHITE_BG}">
    <tr><td style="padding:28px 24px;text-align:center;${WHITE_BG}">
      <div class="email-stripe-link" style="font-size:11px;font-weight:600;color:#635bff;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:8px;">Amount Due</div>
      <div class="email-payment-amount" style="font-size:32px;font-weight:700;color:#18181b;line-height:1.2;margin-bottom:6px;">${esc(amountLabel)}</div>
      <div class="email-muted" style="font-size:13px;color:#71717a;margin-bottom:22px;">Due ${esc(dueDateLabel)}</div>
      <table cellpadding="0" cellspacing="0" align="center" style="margin:0 auto;">
        <tr><td style="background:#635bff;border-radius:8px;padding:16px 40px;">
          <a href="${safeUrl}" target="_blank" style="color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:600;text-decoration:none;display:inline-block;">
            Pay with Stripe
          </a>
        </td></tr>
      </table>
      <div style="margin-top:18px;font-size:13px;line-height:1.5;">
        <a href="${safeUrl}" target="_blank" class="email-stripe-link" style="color:#635bff;font-weight:600;text-decoration:underline;">Click here to pay online</a>
      </div>
      <div class="email-muted" style="margin-top:10px;font-size:12px;color:#71717a;line-height:1.5;">
        Secure Stripe checkout · Card, Apple Pay, Google Pay
      </div>
    </td></tr>
  </table>`;
}

export function generateInvoiceEmailHtml(
  state: DraftState,
  options?: InvoiceEmailRenderOptions | string
): string {
  const renderOptions: InvoiceEmailRenderOptions =
    typeof options === "string" ? { logoUrl: options } : (options ?? {});
  const logoDataUrl = renderOptions.logoUrl;
  const paymentUrl = renderOptions.paymentUrl ?? null;
  const { docType, client, services, laborTitle, laborHours, laborRate, notes } =
    state;
  const totals = calculateDraftTotals(state);
  const taxLabel = "Tax";
  const projectName = (client.projectName ?? "").trim() || "Untitled Project";
  const hasLabor =
    Boolean((laborTitle ?? "").trim()) || laborHours > 0 || laborRate > 0;

  const logoHtml = logoDataUrl
    ? `<img src="${logoDataUrl}" alt="Over Drive OS" width="140" style="display:block;height:auto;border:0;" />`
    : `<div style="font-size:14px;font-weight:700;color:#18181b;">Over Drive OS</div>`;

  const lineRows = services
    .map(
      (item, index) => `<tr style="background:${index % 2 === 1 ? "#fafafa" : "#ffffff"};">
        <td class="email-line-item" style="padding:10px 12px;border-bottom:1px solid #f4f4f5;font-size:13px;color:#18181b;">${esc((item.service ?? "").trim() || "-")}</td>
        <td class="email-body-text" style="padding:10px 12px;border-bottom:1px solid #f4f4f5;border-left:1px solid #f4f4f5;font-size:13px;color:#3f3f46;">${esc((item.description ?? "").trim() || "-")}</td>
        <td class="email-line-item" style="padding:10px 12px;border-bottom:1px solid #f4f4f5;border-left:1px solid #f4f4f5;font-size:13px;color:#27272a;text-align:center;">${item.quantity}</td>
        <td class="email-line-item" style="padding:10px 12px;border-bottom:1px solid #f4f4f5;border-left:1px solid #f4f4f5;font-size:13px;color:#27272a;text-align:right;">${moneyForEmail(item.unitPrice)}</td>
        <td class="email-line-item" style="padding:10px 12px;border-bottom:1px solid #f4f4f5;border-left:1px solid #f4f4f5;font-size:13px;color:#27272a;font-weight:600;text-align:right;">${moneyForEmail(item.quantity * item.unitPrice)}</td>
      </tr>`
    )
    .join("");

  const laborHtml = hasLabor
    ? `<td width="50%" valign="top" style="padding-right:8px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e4e4e7;border-radius:8px;background:#fafafa;">
          <tr><td style="padding:16px;">
            <div style="font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:12px;">Labor</div>
            ${(laborTitle ?? "").trim() ? `<div style="font-size:13px;color:#18181b;margin-bottom:8px;">${esc((laborTitle ?? "").trim())}</div>` : ""}
            <div style="font-size:12px;color:#71717a;">${laborHours || 0} hrs @ ${moneyForEmail(laborRate)}</div>
            <div style="margin-top:12px;font-size:16px;font-weight:700;color:#18181b;text-align:right;">${moneyForEmail(totals.laborTotal)}</div>
          </td></tr>
        </table>
      </td>`
    : "";

  const summaryColspan = hasLabor ? "" : ' colspan="2"';

  const depositRow =
    docType === "Invoice" && totals.deposit > 0
      ? summaryRow("Deposit", `-${moneyForEmail(totals.deposit)}`)
      : "";

  const amountDue =
    docType === "Invoice" ? totals.balanceDue : totals.grandTotal;

  const paymentHtml =
    docType === "Invoice" &&
    paymentUrl &&
    totals.balanceDue >= 0.5
      ? paymentCardHtml(
          paymentUrl,
          moneyForEmail(totals.balanceDue),
          formatDisplayDate(client.dueDate)
        )
      : "";

  const notesHtml = (notes ?? "").trim()
    ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
        <tr><td style="border-top:1px solid #f4f4f5;padding-top:24px;">
          <div style="font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:10px;">Notes &amp; Terms</div>
          <div style="font-size:13px;line-height:1.6;color:#3f3f46;white-space:pre-wrap;">${esc((notes ?? "").trim())}</div>
        </td></tr>
      </table>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>${EMAIL_HEAD}</head>
<body class="email-bg" bgcolor="#ffffff" style="margin:0;padding:0;${WHITE_BG}font-family:Arial,Helvetica,sans-serif;color:#18181b;">
  <table width="100%" cellpadding="0" cellspacing="0" class="email-bg" bgcolor="#ffffff" style="${WHITE_BG}padding:24px 12px;">
    <tr>
      <td align="center" class="email-bg" bgcolor="#ffffff" style="${WHITE_BG}">
      <table width="640" cellpadding="0" cellspacing="0" class="email-card email-bg" bgcolor="#ffffff" style="max-width:640px;width:100%;${WHITE_BG}border-radius:8px;">
        <tr>
          <td class="email-bg" bgcolor="#ffffff" style="padding:32px 40px;${WHITE_BG}">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td valign="top">${logoHtml}</td>
              <td valign="top" align="right">
                <div class="email-label" style="font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.1em;">${esc(docType.toUpperCase())}</div>
                <div class="email-title" style="margin-top:4px;font-size:24px;font-weight:600;color:#18181b;line-height:1.2;">${esc(projectName)}</div>
                <div class="email-subtitle" style="margin-top:6px;font-size:13px;color:#71717a;">${esc(client.documentNumber)}</div>
              </td>
            </tr>
          </table>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td style="border-top:1px solid #f4f4f5;"></td></tr></table>

          ${paymentHtml}

          <table width="100%" cellpadding="0" cellspacing="0" class="email-panel" style="border:1px solid #e4e4e7;border-radius:8px;${WHITE_BG}">
            <tr>
              <td width="50%" valign="top" class="email-bg" style="padding:16px 20px;border-right:1px solid #e4e4e7;${WHITE_BG}">
                <div class="email-label" style="font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:12px;">Bill To</div>
                <table width="100%" cellpadding="0" cellspacing="0">
                  ${fieldBlock("Name", client.clientName)}
                  ${fieldBlock("Company", client.companyName)}
                  ${fieldBlock("Email", client.email)}
                  ${fieldBlock("Phone", client.phone)}
                  ${fieldBlock("Website", client.url)}
                </table>
              </td>
              <td width="50%" valign="top" class="email-bg" style="padding:16px 20px;${WHITE_BG}">
                <div class="email-label" style="font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:12px;">Project Details</div>
                <table width="100%" cellpadding="0" cellspacing="0">
                  ${fieldBlock("Project", client.projectName)}
                  ${fieldBlock(`${docType} #`, client.documentNumber)}
                  ${fieldBlock("Issued", formatDisplayDate(client.issueDate))}
                  ${fieldBlock("Due", formatDisplayDate(client.dueDate))}
                </table>
              </td>
            </tr>
          </table>

          <div class="email-label" style="margin:24px 0 8px;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.1em;">Line Items</div>
          <table width="100%" cellpadding="0" cellspacing="0" class="email-bg" style="border:1px solid #e4e4e7;border-radius:8px;overflow:hidden;border-collapse:separate;${WHITE_BG}">
            <thead>
              <tr style="background:#f4f4f5;">
                <th align="left" class="email-muted" style="padding:10px 12px;font-size:11px;font-weight:600;color:#71717a;text-transform:uppercase;">Item</th>
                <th align="left" style="padding:10px 12px;border-left:1px solid #e4e4e7;font-size:11px;font-weight:600;color:#71717a;text-transform:uppercase;">Description</th>
                <th align="center" style="padding:10px 12px;border-left:1px solid #e4e4e7;font-size:11px;font-weight:600;color:#71717a;text-transform:uppercase;">Qty</th>
                <th align="right" style="padding:10px 12px;border-left:1px solid #e4e4e7;font-size:11px;font-weight:600;color:#71717a;text-transform:uppercase;">Rate</th>
                <th align="right" style="padding:10px 12px;border-left:1px solid #e4e4e7;font-size:11px;font-weight:600;color:#71717a;text-transform:uppercase;">Amount</th>
              </tr>
            </thead>
            <tbody>${lineRows}</tbody>
          </table>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
            <tr>
              ${laborHtml}
              <td${summaryColspan} valign="top" style="padding-left:${hasLabor ? "8px" : "0"};">
                <table width="100%" cellpadding="0" cellspacing="0" class="email-panel" style="border:1px solid #e4e4e7;border-radius:8px;${WHITE_BG}">
                  <tr><td style="padding:16px;${WHITE_BG}">
                    <div class="email-label" style="font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:10px;">Summary</div>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      ${summaryRow("Services", moneyForEmail(totals.serviceSubtotal))}
                      ${summaryRow("Labor", moneyForEmail(totals.laborTotal))}
                      ${summaryRow("Subtotal", moneyForEmail(totals.subtotal))}
                      ${summaryRow(taxLabel, moneyForEmail(totals.taxAmount))}
                      ${summaryRow("Total", moneyForEmail(totals.grandTotal), true)}
                      ${depositRow}
                    </table>
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;border-top:1px solid #e4e4e7;">
                      <tr>
                        <td class="email-total" style="padding-top:12px;font-size:13px;font-weight:600;color:#18181b;">${docType === "Invoice" ? "Total Due" : "Total"}</td>
                        <td class="email-total" style="padding-top:12px;font-size:22px;font-weight:700;color:#18181b;text-align:right;">${moneyForEmail(amountDue)}</td>
                      </tr>
                    </table>
                  </td></tr>
                </table>
              </td>
            </tr>
          </table>

          ${notesHtml}

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
            <tr><td align="center" class="email-footer" style="font-size:11px;font-weight:500;color:#a1a1aa;letter-spacing:0.04em;">www.overdriveio.com</td></tr>
          </table>
          </td>
        </tr>
      </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function generateInvoicePlainText(
  state: DraftState,
  options?: { paymentUrl?: string | null }
): string {
  const { docType, client, notes } = state;
  const totals = calculateDraftTotals(state);
  const amountDue =
    docType === "Invoice" ? totals.balanceDue : totals.grandTotal;
  const lines = [
    `${docType} ${client.documentNumber}`,
    client.projectName || "Untitled Project",
    "",
    `${docType === "Invoice" ? "Total Due" : "Total"}: ${moneyForEmail(amountDue)}`,
    `Due Date: ${formatDisplayDate(client.dueDate)}`,
    "",
    (notes ?? "").trim() || "",
  ];

  if (
    docType === "Invoice" &&
    options?.paymentUrl &&
    totals.balanceDue >= 0.5
  ) {
    lines.unshift("", `Pay online: ${options.paymentUrl}`, "");
  }

  lines.push("", "— Over Drive OS", "www.overdriveio.com");

  return lines.filter(Boolean).join("\n");
}

export async function sendInvoiceEmail(
  state: DraftState,
  recipient: string
): Promise<{ to: string; subject: string; paymentIncluded: boolean }> {
  const to = recipient.trim();
  if (!to) {
    throw new Error("Enter a client email address to send the invoice.");
  }

  const response = await fetch("/api/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state, to }),
  });

  const data = (await response.json().catch(() => ({}))) as {
    error?: string;
    to?: string;
    subject?: string;
    paymentIncluded?: boolean;
  };

  if (!response.ok) {
    throw new Error(data.error || "Failed to send email");
  }

  return {
    to: data.to ?? to,
    subject: data.subject ?? buildLocalEmailSubject(state),
    paymentIncluded: Boolean(data.paymentIncluded),
  };
}

function buildLocalEmailSubject(state: DraftState): string {
  const project = (state.client.projectName ?? "").trim() || "Over Drive OS";
  return `${state.docType} ${state.client.documentNumber} — ${project}`;
}
