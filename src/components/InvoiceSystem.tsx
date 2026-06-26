"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import InvoicePaperFooter from "@/components/InvoicePaperFooter";
import InvoicePaperHeader from "@/components/InvoicePaperHeader";
import {
  createDefaultState,
  formatMoney as money,
  generateDocumentNumber,
  getDraft,
  saveDraftToLibrary,
  type ClientInfo,
  type DocType,
  type DraftState,
  type ServiceItem,
} from "@/lib/drafts";
import { downloadPdf as exportPdf } from "@/lib/pdf-export";
import {
  finalizeCompletedInvoice,
  loadOpenedSubmission,
  syncToInternalDatabase,
} from "@/lib/storage/dbClient";

type Toast = { message: string; type: "success" | "error" } | null;

function formatMoneyInput(amount: number): string {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function parseCurrencyInput(raw: string): number {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatPhoneNumber(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    digits = digits.slice(1);
  }
  digits = digits.slice(0, 10);

  if (digits.length === 0) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export default function InvoiceSystem() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const draftParam = searchParams.get("draft");

  const [initialDraft] = useState(() => {
    const opened = loadOpenedSubmission();
    if (opened) return opened;

    if (draftParam) {
      const draft = getDraft(draftParam);
      if (draft) return { state: draft.state, draftId: draft.id };
    }

    return { state: createDefaultState(), draftId: null as string | null };
  });
  const [state, setState] = useState<DraftState>(initialDraft.state);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(
    initialDraft.draftId
  );
  const [toast, setToast] = useState<Toast>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [showExitPrompt, setShowExitPrompt] = useState(false);

  const {
    docType,
    taxRate,
    client,
    services,
    laborTitle,
    laborHours,
    laborRate,
    deposit,
    notes,
  } = state;

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const serviceSubtotal = useMemo(() => {
    return services.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );
  }, [services]);

  const laborTotal = laborHours * laborRate;
  const subtotal = serviceSubtotal + laborTotal;
  const taxAmount = subtotal * taxRate;
  const grandTotal = subtotal + taxAmount;
  const balanceDue = Math.max(0, grandTotal - (deposit ?? 0));

  const updateClient = (field: keyof ClientInfo, value: string) => {
    setState((prev) => ({
      ...prev,
      client: { ...prev.client, [field]: value },
    }));
  };

  const updateService = (
    id: number,
    field: keyof ServiceItem,
    value: string | number
  ) => {
    setState((prev) => ({
      ...prev,
      services: prev.services.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }));
  };

  const addService = () => {
    setState((prev) => ({
      ...prev,
      services: [
        ...prev.services,
        {
          id: Date.now(),
          service: "",
          description: "",
          quantity: 1,
          unitPrice: 0,
        },
      ],
    }));
  };

  const removeService = (id: number) => {
    setState((prev) => ({
      ...prev,
      services:
        prev.services.length > 1
          ? prev.services.filter((item) => item.id !== id)
          : prev.services,
    }));
  };

  const handleDocTypeChange = (next: DocType) => {
    setState((prev) => ({
      ...prev,
      docType: next,
      client: {
        ...prev.client,
        documentNumber: generateDocumentNumber(next),
      },
    }));
  };

  const syncCurrentToDatabase = async (draftId: string | null) => {
    try {
      await syncToInternalDatabase({
        document: { ...state, draftId },
      });
    } catch {
      // silent — local draft still saved
    }
  };

  const handleSaveDraft = () => {
    const id = saveDraftToLibrary(state, currentDraftId);
    setCurrentDraftId(id);
    syncCurrentToDatabase(id);
    setToast({ message: "Draft saved successfully", type: "success" });
  };

  const handleDownloadPdf = async () => {
    setIsExporting(true);
    try {
      const filename = client.documentNumber || docType;
      await exportPdf("invoice-preview", filename, state);
      setToast({ message: "PDF downloaded to your device", type: "success" });
    } catch (error) {
      console.error("PDF export failed:", error);
      setToast({ message: "Failed to generate PDF", type: "error" });
    } finally {
      setIsExporting(false);
    }
  };

  const handleSend = () => {
    if (!client.email) {
      setToast({
        message: "Please enter a client email address",
        type: "error",
      });
      return;
    }
    const subject = encodeURIComponent(
      `${docType} ${client.documentNumber} — ${client.projectName || "Over Drive OS"}`
    );
    const body = encodeURIComponent(
      `Hi ${client.clientName || "there"},\n\nPlease find your ${docType.toLowerCase()} from Over Drive OS.\n\nTotal: ${money(balanceDue)}\nDue Date: ${client.dueDate}\n\nThank you for your business.\n\n— Over Drive OS`
    );
    window.open(
      `mailto:${client.email}?subject=${subject}&body=${body}`,
      "_blank"
    );
    setToast({ message: "Email client opened", type: "success" });
  };

  const handleConvertToInvoice = async () => {
    setIsConverting(true);
    try {
      const invoiceState: DraftState = {
        ...state,
        docType: "Invoice",
        client: {
          ...state.client,
          documentNumber: generateDocumentNumber("Invoice"),
        },
      };

      const { draftId, savedToAdmin } = await finalizeCompletedInvoice(
        invoiceState,
        currentDraftId
      );

      const params = new URLSearchParams({ draft: draftId });
      if (!savedToAdmin) params.set("sync", "failed");
      router.push(`/invoice/complete?${params.toString()}`);
    } catch {
      setToast({ message: "Failed to convert invoice", type: "error" });
    } finally {
      setIsConverting(false);
    }
  };

  const handleClearForm = () => {
    setState(createDefaultState(docType));
    setCurrentDraftId(null);
    setToast({ message: "Form cleared", type: "success" });
  };

  const handleExitSave = () => {
    const id = saveDraftToLibrary(state, currentDraftId);
    syncCurrentToDatabase(id);
    setShowExitPrompt(false);
    router.push("/");
  };

  const handleExitDiscard = () => {
    setShowExitPrompt(false);
    router.push("/");
  };

  return (
    <main className="min-h-screen">
      {/* App navigation — not included in PDF */}
      <nav className="app-nav">
        <div className="app-nav-inner">
          <button
            type="button"
            onClick={() => setShowExitPrompt(true)}
            className="cursor-pointer rounded-md transition opacity-90 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            aria-label="Back to home"
          >
            <Image
              src="/overdrive-logo.png"
              alt="Over Drive"
              width={800}
              height={289}
              priority
              className="h-16 w-auto md:h-20"
            />
          </button>

          <div className="segmented">
            {(["Quote", "Invoice"] as DocType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => handleDocTypeChange(type)}
                className={`segmented-btn ${docType === type ? "segmented-btn-active" : ""}`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <div className="app-body">
        {/* Invoice document — exported to PDF */}
        <article id="invoice-preview" className="paper">
          <div className="paper-inner">
            <InvoicePaperHeader
              docType={docType}
              projectName={client.projectName}
            />

            <div className="paper-divider" />

            {/* Client + meta */}
            <div className="grid gap-10 sm:grid-cols-2">
              <div>
                <p className="doc-heading mb-4">Bill To</p>
                <div className="space-y-3">
                  <Field label="Name">
                    <input
                      className="field"
                      placeholder="Client name"
                      value={client.clientName}
                      onChange={(e) => updateClient("clientName", e.target.value)}
                    />
                  </Field>
                  <Field label="Company">
                    <input
                      className="field"
                      placeholder="Company name"
                      value={client.companyName}
                      onChange={(e) => updateClient("companyName", e.target.value)}
                    />
                  </Field>
                  <Field label="Email">
                    <input
                      className="field"
                      type="email"
                      placeholder="email@company.com"
                      value={client.email}
                      onChange={(e) => updateClient("email", e.target.value)}
                    />
                  </Field>
                  <Field label="Phone">
                    <input
                      className="field"
                      type="tel"
                      inputMode="tel"
                      placeholder="(555) 123-4567"
                      value={formatPhoneNumber(client.phone ?? "")}
                      onChange={(e) =>
                        updateClient("phone", formatPhoneNumber(e.target.value))
                      }
                    />
                  </Field>
                  <Field label="Website">
                    <input
                      className="field"
                      type="url"
                      placeholder="https://"
                      value={client.url ?? ""}
                      onChange={(e) => updateClient("url", e.target.value)}
                    />
                  </Field>
                </div>
              </div>

              <div>
                <p className="doc-heading mb-4">Project Details</p>
                <div className="space-y-3">
                  <Field label="Project Name">
                    <input
                      className="field"
                      placeholder="Project name"
                      value={client.projectName}
                      onChange={(e) => updateClient("projectName", e.target.value)}
                    />
                  </Field>
                  <Field label={`${docType} Number`}>
                    <input
                      className="field"
                      placeholder="INV-000001"
                      value={client.documentNumber}
                      onChange={(e) =>
                        updateClient("documentNumber", e.target.value)
                      }
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Issue Date">
                      <input
                        className="field"
                        type="date"
                        value={client.issueDate}
                        onChange={(e) => updateClient("issueDate", e.target.value)}
                      />
                    </Field>
                    <Field label="Due Date">
                      <input
                        className="field"
                        type="date"
                        value={client.dueDate}
                        onChange={(e) => updateClient("dueDate", e.target.value)}
                      />
                    </Field>
                  </div>
                  <Field label="Tax Rate">
                    <select
                      value={taxRate}
                      onChange={(e) =>
                        setState((prev) => ({
                          ...prev,
                          taxRate: Number(e.target.value),
                        }))
                      }
                      className="select-field"
                    >
                      <option value={0}>No tax</option>
                      <option value={0.07}>7%</option>
                      <option value={0.08}>8%</option>
                      <option value={0.09}>9%</option>
                    </select>
                  </Field>
                </div>
              </div>
            </div>

            <div className="paper-divider" />

            {/* Services */}
            <div>
              <div className="mb-4 flex items-center justify-between">
                <p className="doc-heading">Line Items</p>
                <button type="button" onClick={addService} className="btn-add no-print">
                  + Add line item
                </button>
              </div>

              <div className="hidden md:block">
                <table className="line-items">
                  <thead>
                    <tr>
                      <th className="w-[22%]">Item</th>
                      <th className="w-[34%]">Description</th>
                      <th className="w-[10%]">Qty</th>
                      <th className="w-[16%]">Rate</th>
                      <th className="w-[14%] text-right">Amount</th>
                      <th className="w-[4%]" />
                    </tr>
                  </thead>
                  <tbody>
                    {services.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <input
                            className="field-table"
                            placeholder="Service"
                            value={item.service}
                            onChange={(e) =>
                              updateService(item.id, "service", e.target.value)
                            }
                          />
                        </td>
                        <td>
                          <input
                            className="field-table"
                            placeholder="Description"
                            value={item.description}
                            onChange={(e) =>
                              updateService(item.id, "description", e.target.value)
                            }
                          />
                        </td>
                        <td>
                          <input
                            className="field-table w-16"
                            type="number"
                            min={0}
                            value={item.quantity || ""}
                            onChange={(e) =>
                              updateService(
                                item.id,
                                "quantity",
                                Number(e.target.value)
                              )
                            }
                          />
                        </td>
                        <td>
                          <CurrencyInput
                            variant="table"
                            value={item.unitPrice}
                            onChange={(v) =>
                              updateService(item.id, "unitPrice", v)
                            }
                          />
                        </td>
                        <td className="text-right">
                          <span className="font-medium tabular-nums text-zinc-800">
                            {money(item.quantity * item.unitPrice)}
                          </span>
                        </td>
                        <td className="text-right">
                          <button
                            type="button"
                            onClick={() => removeService(item.id)}
                            className="btn-ghost no-print"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile line items */}
              <div className="space-y-0 overflow-hidden rounded-lg border border-zinc-200 md:hidden">
                {services.map((item, index) => (
                  <div
                    key={item.id}
                    className={`space-y-3 border-b border-zinc-100 p-4 last:border-b-0 ${
                      index % 2 === 0 ? "bg-white" : "bg-zinc-50"
                    }`}
                  >
                    <Field label="Item">
                      <input
                        className="field"
                        value={item.service}
                        onChange={(e) =>
                          updateService(item.id, "service", e.target.value)
                        }
                      />
                    </Field>
                    <Field label="Description">
                      <input
                        className="field"
                        value={item.description}
                        onChange={(e) =>
                          updateService(item.id, "description", e.target.value)
                        }
                      />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Qty">
                        <input
                          className="field"
                          type="number"
                          min={0}
                          value={item.quantity || ""}
                          onChange={(e) =>
                            updateService(
                              item.id,
                              "quantity",
                              Number(e.target.value)
                            )
                          }
                        />
                      </Field>
                      <Field label="Rate">
                        <CurrencyInput
                          value={item.unitPrice}
                          onChange={(v) =>
                            updateService(item.id, "unitPrice", v)
                          }
                        />
                      </Field>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-medium tabular-nums text-zinc-800">
                        {money(item.quantity * item.unitPrice)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeService(item.id)}
                        className="btn-ghost"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="paper-divider" />

            {/* Labor + Totals */}
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="info-card">
                <p className="info-card-heading">Labor</p>
                <div className="space-y-3">
                  <Field label="Description">
                    <input
                      className="field"
                      placeholder="e.g. Development hours"
                      value={laborTitle}
                      onChange={(e) =>
                        setState((prev) => ({
                          ...prev,
                          laborTitle: e.target.value,
                        }))
                      }
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Hours">
                      <input
                        className="field"
                        type="number"
                        min={0}
                        step={1}
                        placeholder="0"
                        value={laborHours || ""}
                        onChange={(e) =>
                          setState((prev) => ({
                            ...prev,
                            laborHours: Number(e.target.value),
                          }))
                        }
                      />
                    </Field>
                    <Field label="Rate">
                      <CurrencyInput
                        value={laborRate}
                        onChange={(v) =>
                          setState((prev) => ({ ...prev, laborRate: v }))
                        }
                      />
                    </Field>
                  </div>
                  <div className="flex items-center justify-between rounded-md border border-zinc-200 bg-white px-4 py-3">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                        Labor Total
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {laborHours || 0} hrs × {money(laborRate)}
                      </p>
                    </div>
                    <span className="text-base font-semibold tabular-nums text-zinc-900">
                      {money(laborTotal)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="info-card">
                <p className="info-card-heading">Summary</p>
                <div className="totals-panel">
                  <SummaryRow
                    label="Services"
                    value={money(serviceSubtotal)}
                  />
                  <SummaryRow label="Labor" value={money(laborTotal)} />
                  <SummaryRow label="Subtotal" value={money(subtotal)} />
                  <SummaryRow
                    label={
                      taxRate === 0
                        ? "Tax"
                        : `Tax (${(taxRate * 100).toFixed(0)}%)`
                    }
                    value={money(taxAmount)}
                  />
                  <SummaryRow label="Total" value={money(grandTotal)} />
                  <div className="flex items-center justify-between gap-4 pt-1">
                    <span className="text-[13px] text-zinc-500">Deposit</span>
                    <CurrencyInput
                      value={deposit ?? 0}
                      onChange={(v) =>
                        setState((prev) => ({ ...prev, deposit: v }))
                      }
                      className="w-36"
                    />
                  </div>
                  {(deposit ?? 0) > 0 && (
                    <SummaryRow
                      label="Less Deposit"
                      value={`−${money(deposit ?? 0)}`}
                    />
                  )}
                  <div className="totals-grand">
                    <span className="text-sm font-semibold text-zinc-900">
                      Total Due
                    </span>
                    <span className="text-2xl font-bold tabular-nums text-zinc-900">
                      {money(balanceDue)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="paper-divider" />

            {/* Notes */}
            <div>
              <p className="doc-heading mb-3">Notes & Terms</p>
              <textarea
                className="field min-h-[96px] resize-y"
                placeholder="Payment terms, scope notes, delivery timeline…"
                value={notes}
                onChange={(e) =>
                  setState((prev) => ({ ...prev, notes: e.target.value }))
                }
              />
            </div>

            <InvoicePaperFooter />
          </div>
        </article>

        {/* Actions — outside PDF */}
        <div className="action-bar">
          <button type="button" onClick={handleClearForm} className="btn-outline">
            Clear
          </button>
          <button type="button" onClick={handleSaveDraft} className="btn-outline">
            Save Draft
          </button>
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isExporting}
            className="btn-outline"
          >
            {isExporting ? "Generating…" : "Download PDF"}
          </button>
          <button type="button" onClick={handleSend} className="btn-outline">
            Send {docType}
          </button>
          {docType === "Quote" && (
            <button
              type="button"
              onClick={handleConvertToInvoice}
              disabled={isConverting}
              className="btn"
            >
              {isConverting ? "Converting…" : "Convert to Invoice"}
            </button>
          )}
        </div>
      </div>

      {showExitPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="exit-dialog-title"
            className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 shadow-xl"
          >
            <h2
              id="exit-dialog-title"
              className="text-base font-semibold text-zinc-900"
            >
              Save before leaving?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-500">
              Would you like to save your current {docType.toLowerCase()} to
              drafts before returning home?
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowExitPrompt(false)}
                className="btn-outline order-3 sm:order-1"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExitDiscard}
                className="btn-outline order-2"
              >
                Don&apos;t Save
              </button>
              <button
                type="button"
                onClick={handleExitSave}
                className="btn order-1 sm:order-3"
              >
                Save Draft
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 rounded-md px-4 py-2.5 text-[13px] font-medium shadow-lg ${
            toast.type === "success"
              ? "bg-zinc-900 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}
    </main>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block min-w-0 ${className ?? ""}`}>
      <span className="doc-label">{label}</span>
      {children}
    </label>
  );
}

function CurrencyInput({
  value,
  onChange,
  className,
  variant = "field",
}: {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  variant?: "field" | "table";
}) {
  const [focused, setFocused] = useState(false);
  const [display, setDisplay] = useState("");

  const handleFocus = () => {
    setFocused(true);
    setDisplay(value ? String(value) : "");
  };

  const handleBlur = () => {
    setFocused(false);
    const parsed = parseCurrencyInput(display);
    onChange(parsed);
  };

  const handleChange = (raw: string) => {
    setDisplay(raw);
    onChange(parseCurrencyInput(raw));
  };

  return (
    <div
      className={`${variant === "table" ? "currency-wrap-table" : "currency-wrap"} ${className ?? ""}`}
    >
      <span className="currency-symbol">$</span>
      <input
        className="currency-field"
        inputMode="decimal"
        placeholder="0.00"
        value={focused ? display : value ? formatMoneyInput(value) : ""}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={(e) => handleChange(e.target.value)}
      />
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
