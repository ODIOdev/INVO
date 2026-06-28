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
    <div style="font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">${esc(label)}</div>
    <div style="font-size:13px;color:#18181b;line-height:1.4;">${esc(trimmed)}</div>
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

function paymentButtonHtml(paymentUrl: string, amountLabel: string): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
    <tr><td align="center" style="padding:8px 0 4px;">
      <a href="${esc(paymentUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#635bff;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:8px;letter-spacing:0.01em;">
        Pay ${esc(amountLabel)} Securely
      </a>
    </td></tr>
    <tr><td align="center" style="padding-top:8px;font-size:12px;color:#71717a;">
      Secure payment powered by Stripe
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
  const { docType, taxRate, client, services, laborTitle, laborHours, laborRate, notes } =
    state;
  const totals = calculateDraftTotals(state);
  const taxLabel =
    taxRate === 0 ? "Tax" : `Tax (${(taxRate * 100).toFixed(0)}%)`;
  const projectName = (client.projectName ?? "").trim() || "Untitled Project";
  const hasLabor =
    Boolean((laborTitle ?? "").trim()) || laborHours > 0 || laborRate > 0;

  const logoHtml = logoDataUrl
    ? `<img src="${logoDataUrl}" alt="Over Drive OS" width="140" style="display:block;height:auto;border:0;" />`
    : `<div style="font-size:14px;font-weight:700;color:#18181b;">Over Drive OS</div>`;

  const lineRows = services
    .map(
      (item, index) => `<tr style="background:${index % 2 === 1 ? "#fafafa" : "#ffffff"};">
        <td style="padding:10px 12px;border-bottom:1px solid #f4f4f5;font-size:13px;color:#18181b;">${esc((item.service ?? "").trim() || "-")}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f4f4f5;border-left:1px solid #f4f4f5;font-size:13px;color:#3f3f46;">${esc((item.description ?? "").trim() || "-")}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f4f4f5;border-left:1px solid #f4f4f5;font-size:13px;color:#27272a;text-align:center;">${item.quantity}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f4f4f5;border-left:1px solid #f4f4f5;font-size:13px;color:#27272a;text-align:right;">${moneyForEmail(item.unitPrice)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f4f4f5;border-left:1px solid #f4f4f5;font-size:13px;color:#27272a;font-weight:600;text-align:right;">${moneyForEmail(item.quantity * item.unitPrice)}</td>
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
    totals.deposit > 0
      ? summaryRow("Deposit", `-${moneyForEmail(totals.deposit)}`)
      : "";

  const notesHtml = (notes ?? "").trim()
    ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
        <tr><td style="border-top:1px solid #f4f4f5;padding-top:24px;">
          <div style="font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:10px;">Notes &amp; Terms</div>
          <div style="font-size:13px;line-height:1.6;color:#3f3f46;white-space:pre-wrap;">${esc((notes ?? "").trim())}</div>
        </td></tr>
      </table>`
    : "";

  const paymentHtml =
    paymentUrl && totals.balanceDue >= 0.5
      ? paymentButtonHtml(paymentUrl, moneyForEmail(totals.balanceDue))
      : "";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#eceef1;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#eceef1;padding:24px 12px;">
    <tr><td align="center">
      <table width="640" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06),0 8px 24px rgba(0,0,0,0.06);">
        <tr><td style="padding:32px 40px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td valign="top">${logoHtml}</td>
              <td valign="top" align="right">
                <div style="font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.1em;">${esc(docType.toUpperCase())}</div>
                <div style="margin-top:4px;font-size:24px;font-weight:600;color:#18181b;line-height:1.2;">${esc(projectName)}</div>
                <div style="margin-top:6px;font-size:13px;color:#71717a;">${esc(client.documentNumber)}</div>
              </td>
            </tr>
          </table>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td style="border-top:1px solid #f4f4f5;"></td></tr></table>

          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e4e4e7;border-radius:8px;background:#fcfcfc;">
            <tr>
              <td width="50%" valign="top" style="padding:16px 20px;border-right:1px solid #e4e4e7;">
                <div style="font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:12px;">Bill To</div>
                <table width="100%" cellpadding="0" cellspacing="0">
                  ${fieldBlock("Name", client.clientName)}
                  ${fieldBlock("Company", client.companyName)}
                  ${fieldBlock("Email", client.email)}
                  ${fieldBlock("Phone", client.phone)}
                  ${fieldBlock("Website", client.url)}
                </table>
              </td>
              <td width="50%" valign="top" style="padding:16px 20px;">
                <div style="font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:12px;">Project Details</div>
                <table width="100%" cellpadding="0" cellspacing="0">
                  ${fieldBlock("Project", client.projectName)}
                  ${fieldBlock(`${docType} #`, client.documentNumber)}
                  ${fieldBlock("Issued", formatDisplayDate(client.issueDate))}
                  ${fieldBlock("Due", formatDisplayDate(client.dueDate))}
                  ${fieldBlock("Tax", taxRate === 0 ? "None" : `${(taxRate * 100).toFixed(0)}%`)}
                </table>
              </td>
            </tr>
          </table>

          <div style="margin:24px 0 8px;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.1em;">Line Items</div>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e4e4e7;border-radius:8px;overflow:hidden;border-collapse:separate;">
            <thead>
              <tr style="background:#f4f4f5;">
                <th align="left" style="padding:10px 12px;font-size:11px;font-weight:600;color:#71717a;text-transform:uppercase;">Item</th>
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
                <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e4e4e7;border-radius:8px;background:#fcfcfc;">
                  <tr><td style="padding:16px;">
                    <div style="font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:10px;">Summary</div>
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
                        <td style="padding-top:12px;font-size:13px;font-weight:600;color:#18181b;">Total Due</td>
                        <td style="padding-top:12px;font-size:22px;font-weight:700;color:#18181b;text-align:right;">${moneyForEmail(totals.balanceDue)}</td>
                      </tr>
                    </table>
                  </td></tr>
                </table>
              </td>
            </tr>
          </table>

          ${paymentHtml}

          ${notesHtml}

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
            <tr><td align="center" style="font-size:11px;font-weight:500;color:#a1a1aa;letter-spacing:0.04em;">www.overdriveio.com</td></tr>
          </table>
        </td></tr>
      </table>
    </td></tr>
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
  const lines = [
    `${docType} ${client.documentNumber}`,
    client.projectName || "Untitled Project",
    "",
    `Total Due: ${moneyForEmail(totals.balanceDue)}`,
    `Due Date: ${formatDisplayDate(client.dueDate)}`,
    "",
    (notes ?? "").trim() || "",
  ];

  if (options?.paymentUrl && totals.balanceDue >= 0.5) {
    lines.push("", `Pay online: ${options.paymentUrl}`);
  }

  lines.push("", "— Over Drive OS", "www.overdriveio.com");

  return lines.filter(Boolean).join("\n");
}

export async function sendInvoiceEmail(
  state: DraftState,
  recipient: string
): Promise<{ to: string; subject: string; mode: "sent" | "compose" }> {
  const to = recipient.trim();
  if (!to) {
    throw new Error("Enter a client email address to send the invoice.");
  }

  const subject = buildLocalEmailSubject(state);

  let response: Response;
  try {
    response = await fetch("/api/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state, to }),
    });
  } catch {
    openMailtoCompose(to, subject, generateInvoicePlainText(state));
    return { to, subject, mode: "compose" };
  }

  const data = (await response.json().catch(() => ({}))) as {
    error?: string;
    to?: string;
    subject?: string;
    mode?: "sent" | "compose";
    paymentUrl?: string | null;
  };

  if (!response.ok) {
    openMailtoCompose(
      to,
      subject,
      generateInvoicePlainText(state)
    );
    return { to, subject, mode: "compose" };
  }

  if (data.mode === "compose") {
    const composeSubject = data.subject ?? subject;
    await deliverEmlToMailApp(
      state,
      to,
      composeSubject,
      data.paymentUrl ?? null
    );
    return {
      to: data.to ?? to,
      subject: composeSubject,
      mode: "compose",
    };
  }

  return {
    to: data.to ?? to,
    subject: data.subject ?? subject,
    mode: "sent",
  };
}

function buildLocalEmailSubject(state: DraftState): string {
  const project = (state.client.projectName ?? "").trim() || "Over Drive OS";
  return `${state.docType} ${state.client.documentNumber} — ${project}`;
}

function openMailtoCompose(to: string, subject: string, body: string): void {
  const params = new URLSearchParams({
    subject,
    body,
  });
  window.location.href = `mailto:${encodeURIComponent(to)}?${params.toString()}`;
}

async function deliverEmlToMailApp(
  state: DraftState,
  to: string,
  subject: string,
  paymentUrl: string | null = null
): Promise<void> {
  const plainTextOptions = { paymentUrl };

  let response: Response;
  try {
    response = await fetch("/api/email/compose", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state, to, paymentUrl }),
    });
  } catch {
    openMailtoCompose(to, subject, generateInvoicePlainText(state, plainTextOptions));
    return;
  }

  if (!response.ok) {
    openMailtoCompose(to, subject, generateInvoicePlainText(state, plainTextOptions));
    return;
  }

  const blob = await response.blob();
  const filename = emlDownloadFilename(subject);
  const file = new File([blob], filename, { type: "message/rfc822" });

  if (typeof navigator.share === "function" && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: subject,
        text: `Invoice for ${to}`,
      });
      return;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
    }
  }

  openMailtoCompose(to, subject, generateInvoicePlainText(state, plainTextOptions));
  downloadEmlBlob(blob, filename);
}

function emlDownloadFilename(subject: string): string {
  const safe = subject
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
  return `${safe || "invoice"}.eml`;
}

function downloadEmlBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
