"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import AdminIcon from "@/components/admin/AdminIcons";
import AdminPaymentControls from "@/components/admin/AdminPaymentControls";
import { formatClientAddress, hasClientAddress } from "@/lib/client-form";
import {
  calculateDraftTotals,
  formatMoney,
  getTodayDate,
  type DocType,
  type DraftState,
} from "@/lib/drafts";
import { activityIconName } from "@/lib/admin-icons";
import { DATA_BINS, type StoredRecord } from "@/lib/storage/dataBins";
import {
  deleteStoredRecord,
  fetchRecordById,
  openSubmissionInEditor,
  resolveDraftStateForOpen,
} from "@/lib/storage/dbClient";

type AdminDocumentDetailModalProps = {
  record: StoredRecord | null;
  onClose: () => void;
  onDeleted: () => void | Promise<void>;
  onUpdated?: () => void | Promise<void>;
  stacked?: boolean;
};

type DocumentStatus = "Open" | "Closed" | "Overdue" | "Quote" | "Draft";

type DetailSnapshot = {
  docType: DocType;
  documentNumber: string;
  projectName: string;
  clientName: string;
  companyName: string;
  email: string;
  phone: string;
  address: string;
  issueDate: string;
  dueDate: string;
  serviceSubtotal: number | null;
  laborTotal: number | null;
  subtotal: number | null;
  taxAmount: number | null;
  deposit: number | null;
  amountPaid: number | null;
  grandTotal: number | null;
  balanceDue: number | null;
  status: DocumentStatus | null;
  lineItemCount: number | null;
  notesPreview: string | null;
  canOpenInEditor: boolean;
};

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

function resolveDocumentStatus(
  state: DraftState,
  totals: ReturnType<typeof calculateDraftTotals>,
  fromDraftBin: boolean
): DocumentStatus {
  if (fromDraftBin) return "Draft";
  if (state.docType === "Quote") return "Quote";
  if (totals.balanceDue > 0.01) {
    const today = getTodayDate();
    return state.client.dueDate && state.client.dueDate < today
      ? "Overdue"
      : "Open";
  }
  return "Closed";
}

function statusBadgeClass(status: DocumentStatus): string {
  switch (status) {
    case "Open":
      return "border-amber-200/80 bg-amber-50 text-amber-800";
    case "Closed":
      return "border-emerald-200/80 bg-emerald-50 text-emerald-800";
    case "Overdue":
      return "border-rose-200/80 bg-rose-50 text-rose-700";
    case "Quote":
      return "border-blue-200/80 bg-blue-50 text-blue-800";
    default:
      return "border-zinc-200 bg-zinc-50 text-zinc-600";
  }
}

function snapshotFromState(
  state: DraftState,
  fromDraftBin: boolean
): DetailSnapshot {
  const totals = calculateDraftTotals(state);
  const notes = state.notes.trim();

  return {
    docType: state.docType,
    documentNumber: state.client.documentNumber || "—",
    projectName: state.client.projectName || "Untitled project",
    clientName: state.client.clientName,
    companyName: state.client.companyName,
    email: state.client.email,
    phone: state.client.phone,
    address: hasClientAddress(state.client)
      ? formatClientAddress(state.client)
      : "",
    issueDate: state.client.issueDate,
    dueDate: state.client.dueDate,
    serviceSubtotal: totals.serviceSubtotal,
    laborTotal: totals.laborTotal,
    subtotal: totals.subtotal,
    taxAmount: totals.taxAmount,
    deposit: totals.deposit,
    amountPaid: totals.amountPaid,
    grandTotal: totals.grandTotal,
    balanceDue: totals.balanceDue,
    status: resolveDocumentStatus(state, totals, fromDraftBin),
    lineItemCount: state.services.filter(
      (item) => item.service.trim() || item.description.trim()
    ).length,
    notesPreview: notes ? notes.slice(0, 160) + (notes.length > 160 ? "…" : "") : null,
    canOpenInEditor: true,
  };
}

function snapshotFromRecord(record: StoredRecord): DetailSnapshot {
  const docType =
    record.data.docType === "Quote" ? "Quote" : ("Invoice" as DocType);

  return {
    docType,
    documentNumber: String(record.data.documentNumber ?? "—"),
    projectName: String(record.data.projectName ?? "Untitled project"),
    clientName: "",
    companyName: "",
    email: "",
    phone: "",
    address: "",
    issueDate: String(record.data.issueDate ?? ""),
    dueDate: String(record.data.dueDate ?? ""),
    serviceSubtotal: null,
    laborTotal: null,
    subtotal: null,
    taxAmount: null,
    deposit: null,
    amountPaid: null,
    grandTotal: null,
    balanceDue: null,
    status: null,
    lineItemCount: null,
    notesPreview: null,
    canOpenInEditor: Boolean(record.data.draftId ?? record.data.documentId),
  };
}

function BalanceRow({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="totals-row">
      <span className="totals-row-label">{label}</span>
      <span
        className={
          emphasis ? "totals-row-value font-semibold text-zinc-900" : "totals-row-value"
        }
      >
        {value}
      </span>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  if (!value || value === "—") return null;

  return (
    <div className="flex gap-3 text-sm">
      <dt className="w-20 shrink-0 text-zinc-400">{label}</dt>
      <dd className="min-w-0 text-zinc-800">{value}</dd>
    </div>
  );
}

export default function AdminDocumentDetailModal({
  record,
  onClose,
  onDeleted,
  onUpdated,
  stacked = false,
}: AdminDocumentDetailModalProps) {
  const router = useRouter();
  const [detail, setDetail] = useState<DetailSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [opening, setOpening] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!record) {
      setDetail(null);
      setError(null);
      return;
    }

    let cancelled = false;

    async function load() {
      if (!record) return;

      const activeRecord = record;
      setLoading(true);
      setError(null);

      try {
        let resolvedState: DraftState | null = null;

        if (activeRecord.binId === "drafts" && activeRecord.data.state) {
          resolvedState = activeRecord.data.state as DraftState;
        } else {
          const resolved = await resolveDraftStateForOpen(activeRecord);
          resolvedState = resolved?.state ?? null;
        }

        if (cancelled) return;

        if (resolvedState) {
          const snapshot = snapshotFromState(
            resolvedState,
            activeRecord.binId === "drafts"
          );
          setDetail(snapshot);
        } else {
          setDetail(snapshotFromRecord(activeRecord));
        }
      } catch {
        if (!cancelled) {
          setDetail(snapshotFromRecord(activeRecord));
          setError("Some details could not be loaded.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [record]);

  if (!record) return null;

  const binMeta = DATA_BINS[record.binId];
  const iconName = activityIconName(
    record.binId === "quotes"
      ? "Quote"
      : record.binId === "drafts"
        ? "Draft"
        : "Invoice"
  );

  const handleEdit = async () => {
    setOpening(true);
    setError(null);
    try {
      const opened = await openSubmissionInEditor(record);
      if (opened) {
        router.push("/invoice");
      } else {
        setError("This record cannot be opened in the editor.");
      }
    } catch {
      setError("Failed to open in editor.");
    } finally {
      setOpening(false);
    }
  };

  const reloadDetail = async () => {
    if (!record) return;

    const { record: freshRecord } = await fetchRecordById(record.id);
    let resolvedState: DraftState | null = null;

    if (freshRecord.binId === "drafts" && freshRecord.data.state) {
      resolvedState = freshRecord.data.state as DraftState;
    } else {
      const resolved = await resolveDraftStateForOpen(freshRecord);
      resolvedState = resolved?.state ?? null;
    }

    if (resolvedState) {
      setDetail(
        snapshotFromState(resolvedState, freshRecord.binId === "drafts")
      );
    }
  };

  const handleDelete = async () => {
    const label = detail?.documentNumber ?? record.label;
    if (
      !window.confirm(
        `Delete ${detail?.docType ?? "record"} ${label} from the database?`
      )
    ) {
      return;
    }

    setDeleting(true);
    setError(null);
    try {
      await deleteStoredRecord(record.id);
      await onDeleted();
      onClose();
    } catch {
      setError("Failed to delete record.");
    } finally {
      setDeleting(false);
    }
  };

  const title =
    detail?.documentNumber && detail.documentNumber !== "—"
      ? `${detail.docType} ${detail.documentNumber}`
      : record.label;

  const showPaymentControls =
    detail?.docType === "Invoice" &&
    record.binId !== "drafts" &&
    detail.balanceDue !== null &&
    detail.balanceDue > 0.01;

  const busy = opening || deleting;

  const modal = (
    <div
      className={`fixed inset-0 flex items-center justify-center bg-black/40 p-4 ${
        stacked ? "z-[100]" : "z-50"
      }`}
      onClick={() => {
        if (!busy) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="document-detail-title"
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-zinc-100 bg-zinc-50/80 px-6 py-5">
          <div className="flex items-start gap-3">
            <span className="admin-dash-action-icon mt-0.5 shrink-0">
              <AdminIcon name={iconName} size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <h2
                id="document-detail-title"
                className="truncate text-base font-semibold text-zinc-900"
              >
                {title}
              </h2>
              <p className="mt-0.5 truncate text-sm text-zinc-500">
                {detail?.projectName ?? binMeta.label}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => void handleEdit()}
                className="rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-200/60 hover:text-zinc-700 disabled:opacity-40"
                aria-label="Edit in invoice app"
                disabled={busy || detail?.canOpenInEditor === false}
                title="Edit in invoice app"
              >
                <AdminIcon name="pencil" size={16} />
              </button>
              <button
                type="button"
                onClick={() => void handleDelete()}
                className="rounded-lg p-2 text-zinc-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                aria-label="Delete record"
                disabled={busy}
              >
                <AdminIcon name="trash" size={16} />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-2 py-1.5 text-sm text-zinc-400 transition hover:bg-zinc-200/60 hover:text-zinc-700"
                aria-label="Close"
                disabled={busy}
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {error ? (
            <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {error}
            </p>
          ) : null}

          {loading ? (
            <p className="text-sm text-zinc-500">Loading details…</p>
          ) : detail ? (
            <div className="space-y-5">
              <dl className="space-y-3">
                <DetailRow label="Project" value={detail.projectName} />
                <DetailRow label="Client" value={detail.clientName} />
                <DetailRow label="Company" value={detail.companyName} />
                <DetailRow label="Email" value={detail.email} />
                <DetailRow label="Phone" value={detail.phone} />
                {detail.address ? (
                  <div className="flex gap-3 text-sm">
                    <dt className="w-20 shrink-0 text-zinc-400">Address</dt>
                    <dd className="whitespace-pre-line text-zinc-800">
                      {detail.address}
                    </dd>
                  </div>
                ) : null}
                <DetailRow
                  label="Issued"
                  value={formatDisplayDate(detail.issueDate)}
                />
                <DetailRow
                  label="Due"
                  value={formatDisplayDate(detail.dueDate)}
                />
              </dl>

              {detail.grandTotal !== null ? (
                <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                      Balances
                    </p>
                    {detail.status ? (
                      <span
                        className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusBadgeClass(detail.status)}`}
                      >
                        {detail.status}
                      </span>
                    ) : null}
                  </div>
                  <div className="totals-panel">
                    {detail.serviceSubtotal !== null && detail.serviceSubtotal > 0 ? (
                      <BalanceRow
                        label="Line items"
                        value={formatMoney(detail.serviceSubtotal)}
                      />
                    ) : null}
                    {detail.laborTotal !== null && detail.laborTotal > 0 ? (
                      <BalanceRow
                        label="Systems | Applications"
                        value={formatMoney(detail.laborTotal)}
                      />
                    ) : null}
                    {detail.subtotal !== null ? (
                      <BalanceRow
                        label="Subtotal"
                        value={formatMoney(detail.subtotal)}
                      />
                    ) : null}
                    {detail.taxAmount !== null && detail.taxAmount > 0 ? (
                      <BalanceRow label="Tax" value={formatMoney(detail.taxAmount)} />
                    ) : null}
                    {detail.grandTotal !== null ? (
                      <BalanceRow
                        label={detail.docType === "Quote" ? "Quote total" : "Total"}
                        value={formatMoney(detail.grandTotal)}
                        emphasis
                      />
                    ) : null}
                    {detail.deposit !== null && detail.deposit > 0 ? (
                      <BalanceRow
                        label="Deposit"
                        value={`−${formatMoney(detail.deposit)}`}
                      />
                    ) : null}
                    {detail.amountPaid !== null && detail.amountPaid > 0 ? (
                      <BalanceRow
                        label="Payments received"
                        value={`−${formatMoney(detail.amountPaid)}`}
                      />
                    ) : null}
                    {detail.docType === "Invoice" &&
                    detail.balanceDue !== null ? (
                      <div className="totals-grand">
                        <span className="totals-row-label font-medium text-zinc-700">
                          Balance due
                        </span>
                        <span
                          className={`text-base font-bold tabular-nums ${
                            detail.balanceDue > 0.01
                              ? "text-amber-700"
                              : "text-emerald-700"
                          }`}
                        >
                          {formatMoney(detail.balanceDue)}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {showPaymentControls && record ? (
                <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
                    Record payment
                  </p>
                  <p className="mt-1 text-xs text-emerald-700/80">
                    Deduct a payment from the balance due on this invoice.
                  </p>
                  <div className="mt-3">
                    <AdminPaymentControls
                      key={`${record.id}-${detail.balanceDue}`}
                      recordId={record.id}
                      invoiceLabel={detail.documentNumber}
                      balanceDue={detail.balanceDue ?? 0}
                      onApplied={async () => {
                        await reloadDetail();
                        await onUpdated?.();
                      }}
                    />
                  </div>
                </div>
              ) : null}

              {detail.lineItemCount !== null ? (
                <p className="text-xs text-zinc-500">
                  {detail.lineItemCount} line item
                  {detail.lineItemCount === 1 ? "" : "s"}
                </p>
              ) : null}

              {detail.notesPreview ? (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                    Notes
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-700">
                    {detail.notesPreview}
                  </p>
                </div>
              ) : null}

              <dl className="space-y-2 border-t border-zinc-100 pt-4 text-xs text-zinc-500">
                <div className="flex gap-3">
                  <dt className="w-20 shrink-0">Source</dt>
                  <dd>{record.source}</dd>
                </div>
                <div className="flex gap-3">
                  <dt className="w-20 shrink-0">Updated</dt>
                  <dd>{new Date(record.updatedAt).toLocaleString()}</dd>
                </div>
              </dl>
            </div>
          ) : null}
        </div>

        <div className="border-t border-zinc-100 bg-zinc-50/50 px-6 py-4">
          <button
            type="button"
            onClick={() => void handleEdit()}
            disabled={busy || detail?.canOpenInEditor === false}
            className="btn w-full text-sm disabled:opacity-40"
          >
            {opening ? "Opening in editor…" : "Open in invoice app"}
          </button>
        </div>
      </div>
    </div>
  );

  if (stacked && typeof document !== "undefined") {
    return createPortal(modal, document.body);
  }

  return modal;
}
