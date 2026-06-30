import { resolveStateFromDocumentRecord } from "@/lib/client-balances";
import { calculateDraftTotals, formatMoney, getTodayDate } from "@/lib/drafts";
import type { StoredRecord } from "@/lib/storage/dataBins";

export type DocumentListStatus =
  | "Open"
  | "Closed"
  | "Overdue"
  | "Quote"
  | "Draft";

export type DocumentStatusFilter =
  | "all"
  | "open"
  | "closed"
  | "overdue"
  | "quote"
  | "draft";

export type DocumentListRowMeta = {
  clientName: string;
  projectName: string;
  grandTotal: number;
  balanceDue: number;
  status: DocumentListStatus;
  metaLine: string;
};

function clientNameFromRecord(record: StoredRecord): string {
  const snapshot =
    record.data.clientSnapshot && typeof record.data.clientSnapshot === "object"
      ? (record.data.clientSnapshot as Record<string, unknown>)
      : {};

  return String(
    record.data.clientName ?? snapshot.clientName ?? ""
  ).trim();
}

export function getDocumentListStatus(record: StoredRecord): DocumentListStatus {
  if (record.binId === "drafts") return "Draft";

  const state = resolveStateFromDocumentRecord(record);
  if (!state) {
    return record.binId === "quotes" ? "Quote" : "Open";
  }

  if (state.docType === "Quote") return "Quote";

  const totals = calculateDraftTotals(state);
  if (totals.balanceDue <= 0.01) return "Closed";

  const today = getTodayDate();
  if (state.client.dueDate && state.client.dueDate < today) {
    return "Overdue";
  }

  return "Open";
}

export function getDocumentListRowMeta(record: StoredRecord): DocumentListRowMeta {
  const state = resolveStateFromDocumentRecord(record);
  const totals = state ? calculateDraftTotals(state) : null;
  const status = getDocumentListStatus(record);

  const clientName =
    clientNameFromRecord(record) ||
    String(state?.client.clientName ?? "").trim();
  const projectName = String(
    record.data.projectName ?? state?.client.projectName ?? ""
  ).trim();
  const grandTotal = totals?.grandTotal ?? 0;
  const balanceDue = totals?.balanceDue ?? 0;

  const metaParts = [
    projectName || null,
    clientName || null,
    grandTotal > 0 ? formatMoney(grandTotal) : null,
  ].filter(Boolean);

  return {
    clientName,
    projectName,
    grandTotal,
    balanceDue,
    status,
    metaLine: metaParts.length > 0 ? metaParts.join(" · ") : "No project details",
  };
}

export function documentMatchesStatusFilter(
  record: StoredRecord,
  filter: DocumentStatusFilter
): boolean {
  if (filter === "all") return true;

  const status = getDocumentListStatus(record);
  switch (filter) {
    case "open":
      return status === "Open";
    case "closed":
      return status === "Closed";
    case "overdue":
      return status === "Overdue";
    case "quote":
      return status === "Quote";
    case "draft":
      return status === "Draft";
    default:
      return true;
  }
}

export function statusTabClass(status: DocumentListStatus): string {
  switch (status) {
    case "Open":
      return "admin-client-tab admin-client-tab-open";
    case "Closed":
      return "admin-client-tab admin-client-tab-closed";
    case "Overdue":
      return "admin-client-tab admin-client-tab-overdue";
    case "Quote":
      return "admin-client-tab admin-client-tab-quote";
    default:
      return "admin-client-tab admin-client-tab-open-zero";
  }
}
