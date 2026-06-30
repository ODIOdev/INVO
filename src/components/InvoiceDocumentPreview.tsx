import InvoicePaperFooter from "@/components/InvoicePaperFooter";
import InvoicePaperHeader from "@/components/InvoicePaperHeader";
import {
  calculateDraftTotals,
  formatMoney,
  type DraftState,
} from "@/lib/drafts";
import { formatClientAddress, hasClientAddress } from "@/lib/client-form";

function formatDisplayDate(value: string): string {
  if (!value) return "—";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function PreviewField({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  if (!value) return null;

  return (
    <div>
      <p className={compact ? "doc-label text-[9px]" : "doc-label"}>{label}</p>
      <p className="text-[12px] text-zinc-900">{value}</p>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="totals-row">
      <span className="totals-row-label">{label}</span>
      <span className="totals-row-value">{value}</span>
    </div>
  );
}

type InvoiceDocumentPreviewProps = {
  state: DraftState;
  previewId?: string;
};

export default function InvoiceDocumentPreview({
  state,
  previewId = "invoice-preview",
}: InvoiceDocumentPreviewProps) {
  const { docType, client, services, laborTitle, laborHours, laborRate, notes } =
    state;
  const { serviceSubtotal, laborTotal, subtotal, taxAmount, grandTotal, deposit, balanceDue } =
    calculateDraftTotals(state);

  const taxLabel = "Tax";

  return (
    <article id={previewId} className="paper">
      <div className="paper-inner">
        <InvoicePaperHeader
          docType={docType}
          projectName={client.projectName}
        />

        <div className="paper-divider" />

        <div className="invoice-meta-grid">
          <div className="invoice-meta-card">
            <p className="invoice-meta-card-title">Bill To</p>
            <div className="space-y-1.5">
              <PreviewField label="Name" value={client.clientName} compact />
              <PreviewField label="Company" value={client.companyName} compact />
              <PreviewField label="Email" value={client.email} compact />
              <PreviewField label="Phone" value={client.phone} compact />
              <PreviewField label="Website" value={client.url} compact />
            </div>
          </div>

          <div className="invoice-meta-card">
            <p className="invoice-meta-card-title">Address</p>
            {hasClientAddress(client) ? (
              <p className="whitespace-pre-line text-[12px] leading-relaxed text-zinc-800">
                {formatClientAddress(client)}
              </p>
            ) : (
              <p className="text-[12px] text-zinc-400">—</p>
            )}
          </div>

          <div className="invoice-meta-card">
            <p className="invoice-meta-card-title">Project Details</p>
            <div className="space-y-1.5">
              <PreviewField label="Project" value={client.projectName} compact />
              <PreviewField
                label={`${docType} #`}
                value={client.documentNumber}
                compact
              />
              <PreviewField
                label="Issue Date"
                value={formatDisplayDate(client.issueDate)}
                compact
              />
              <PreviewField
                label="Due Date"
                value={formatDisplayDate(client.dueDate)}
                compact
              />
            </div>
          </div>
        </div>

        <div className="paper-divider" />

        <div>
          <p className="doc-heading section-accent-title mb-4">Line Items</p>
          <table className="line-items">
            <thead>
              <tr>
                <th className="w-[24%]">Item</th>
                <th className="w-[38%]">Description</th>
                <th className="w-[10%]">Qty</th>
                <th className="w-[14%]">Rate</th>
                <th className="w-[14%] text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {services.map((item) => (
                <tr key={item.id}>
                  <td className="text-zinc-900">{item.service || "—"}</td>
                  <td className="text-zinc-700">{item.description || "—"}</td>
                  <td className="tabular-nums text-zinc-800">{item.quantity}</td>
                  <td className="tabular-nums text-zinc-800">
                    {formatMoney(item.unitPrice)}
                  </td>
                  <td className="text-right font-medium tabular-nums text-zinc-800">
                    {formatMoney(item.quantity * item.unitPrice)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="paper-divider" />

        <div className="grid gap-6 lg:grid-cols-2">
          {(laborTitle || laborHours || laborRate) && (
            <div className="info-card">
              <p className="info-card-heading section-accent-title">
                Systems | Applications
              </p>
              <div className="space-y-3">
                {laborTitle && (
                  <PreviewField label="Description" value={laborTitle} />
                )}
                <div className="flex items-center justify-between rounded-md border border-zinc-200 bg-white px-4 py-3">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                      Labor Total
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {laborHours || 0} hrs × {formatMoney(laborRate)}
                    </p>
                  </div>
                  <span className="text-base font-semibold tabular-nums text-zinc-900">
                    {formatMoney(laborTotal)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="info-card">
            <p className="info-card-heading section-accent-title">Summary</p>
            <div className="totals-panel">
              <SummaryRow label="Services" value={formatMoney(serviceSubtotal)} />
              <SummaryRow label="Labor" value={formatMoney(laborTotal)} />
              <SummaryRow label="Subtotal" value={formatMoney(subtotal)} />
              <SummaryRow label={taxLabel} value={formatMoney(taxAmount)} />
              <SummaryRow label="Total" value={formatMoney(grandTotal)} />
              {deposit > 0 && (
                <SummaryRow
                  label="Less Deposit"
                  value={`−${formatMoney(deposit)}`}
                />
              )}
              <div className="totals-grand">
                <span className="text-sm font-semibold text-zinc-900">
                  Total Due
                </span>
                <span className="text-2xl font-bold tabular-nums text-zinc-900">
                  {formatMoney(balanceDue)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {notes.trim() && (
          <>
            <div className="paper-divider" />
            <div>
              <p className="doc-heading section-accent-title mb-3">Notes & Terms</p>
              <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-zinc-700">
                {notes}
              </p>
            </div>
          </>
        )}
        <InvoicePaperFooter />
      </div>
    </article>
  );
}
