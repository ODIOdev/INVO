import {
  calculateDraftTotals,
  getTodayDate,
  type ClientInfo,
  type DraftState,
} from "@/lib/drafts";
import type { StoredRecord } from "@/lib/storage/dataBins";

export type ClientCatalogData = {
  clientName: string;
  companyName: string;
  email: string;
  phone: string;
  url: string;
  profileImage: string;
};

export type ClientBalanceStats = {
  openBalance: number;
  closedBalance: number;
  overdueBalance: number;
  openCount: number;
  closedCount: number;
  overdueCount: number;
};

export type ClientDocumentRow = {
  id: string;
  docType: "Invoice" | "Quote";
  documentNumber: string;
  projectName: string;
  issueDate: string;
  dueDate: string;
  amount: number;
  balanceDue: number;
  status: "Open" | "Closed" | "Overdue" | "Quote";
  updatedAt: string;
};

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

export function clientCatalogFromRecord(record: StoredRecord): ClientCatalogData {
  return {
    clientName: (record.data.clientName as string) || "",
    companyName: (record.data.companyName as string) || "",
    email: (record.data.email as string) || "",
    phone: (record.data.phone as string) || "",
    url: (record.data.url as string) || "",
    profileImage: (record.data.profileImage as string) || "",
  };
}

export function matchesClient(
  catalog: ClientCatalogData,
  draftClient: ClientInfo
): boolean {
  const email = normalize(catalog.email);
  if (email && email === normalize(draftClient.email)) return true;

  const name = normalize(catalog.clientName);
  if (name && name === normalize(draftClient.clientName)) return true;

  const company = normalize(catalog.companyName);
  if (company && company === normalize(draftClient.companyName)) return true;

  return false;
}

function parseDraftState(record: StoredRecord): DraftState | null {
  if (record.binId !== "drafts") return null;
  const state = record.data.state;
  if (!state || typeof state !== "object") return null;
  return state as DraftState;
}

export function computeClientBalanceStats(
  catalog: ClientCatalogData,
  draftRecords: StoredRecord[]
): ClientBalanceStats {
  const today = getTodayDate();
  let openBalance = 0;
  let closedBalance = 0;
  let overdueBalance = 0;
  let openCount = 0;
  let closedCount = 0;
  let overdueCount = 0;

  for (const record of draftRecords) {
    const state = parseDraftState(record);
    if (!state || state.docType !== "Invoice") continue;
    if (!matchesClient(catalog, state.client)) continue;

    const totals = calculateDraftTotals(state);

    if (totals.balanceDue > 0.01) {
      openBalance += totals.balanceDue;
      openCount++;
      if (state.client.dueDate && state.client.dueDate < today) {
        overdueBalance += totals.balanceDue;
        overdueCount++;
      }
    } else {
      closedBalance += totals.grandTotal;
      closedCount++;
    }
  }

  return {
    openBalance,
    closedBalance,
    overdueBalance,
    openCount,
    closedCount,
    overdueCount,
  };
}

export function getClientDocuments(
  catalog: ClientCatalogData,
  draftRecords: StoredRecord[]
): ClientDocumentRow[] {
  const today = getTodayDate();
  const rows: ClientDocumentRow[] = [];

  for (const record of draftRecords) {
    const state = parseDraftState(record);
    if (!state) continue;
    if (!matchesClient(catalog, state.client)) continue;

    const totals = calculateDraftTotals(state);
    let status: ClientDocumentRow["status"];

    if (state.docType === "Quote") {
      status = "Quote";
    } else if (totals.balanceDue > 0.01) {
      status =
        state.client.dueDate && state.client.dueDate < today
          ? "Overdue"
          : "Open";
    } else {
      status = "Closed";
    }

    rows.push({
      id: record.id,
      docType: state.docType,
      documentNumber: state.client.documentNumber || "—",
      projectName: state.client.projectName || "—",
      issueDate: state.client.issueDate,
      dueDate: state.client.dueDate,
      amount: totals.grandTotal,
      balanceDue: totals.balanceDue,
      status,
      updatedAt: record.updatedAt,
    });
  }

  return rows.sort((a, b) => {
    const aTime = new Date(a.issueDate || a.updatedAt).getTime();
    const bTime = new Date(b.issueDate || b.updatedAt).getTime();
    return bTime - aTime;
  });
}
