import {
  calculateDraftTotals,
  getTodayDate,
  type DraftState,
} from "@/lib/drafts";
import { readDatabase } from "@/lib/storage/internalDatabase";
import type { StoredRecord } from "@/lib/storage/dataBins";

export type AdminDashboardActivity = {
  id: string;
  label: string;
  type: "Invoice" | "Quote" | "Client" | "Draft";
  date: string;
  amount: number | null;
};

export type AdminDashboardStats = {
  openInvoices: number;
  closedInvoices: number;
  overdueInvoices: number;
  totalQuotes: number;
  totalInvoices: number;
  newClients: number;
  totalClients: number;
  outstandingBalance: number;
  quotePipeline: number;
  activeDrafts: number;
  collectedDeposits: number;
  recentActivity: AdminDashboardActivity[];
};

function parseDraftState(record: StoredRecord): DraftState | null {
  if (record.binId !== "drafts") return null;
  const state = record.data.state;
  if (!state || typeof state !== "object") return null;
  return state as DraftState;
}

function draftIdFromRecord(record: StoredRecord): string {
  return (
    (record.data.draftId as string) ||
    (record.data.documentId as string) ||
    record.id.replace(/^draft-/, "")
  );
}

function activityTypeForBin(
  binId: StoredRecord["binId"],
  data: Record<string, unknown>
): AdminDashboardActivity["type"] {
  if (binId === "clients") return "Client";
  if (binId === "drafts") {
    return data.docType === "Quote" ? "Quote" : "Draft";
  }
  if (binId === "quotes") return "Quote";
  return "Invoice";
}

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const db = await readDatabase();
  const today = getTodayDate();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const draftStates = new Map<string, DraftState>();
  for (const record of db.records) {
    const state = parseDraftState(record);
    if (!state) continue;
    draftStates.set(draftIdFromRecord(record), state);
  }

  let openInvoices = 0;
  let closedInvoices = 0;
  let overdueInvoices = 0;
  let outstandingBalance = 0;
  let quotePipeline = 0;
  let collectedDeposits = 0;

  for (const state of draftStates.values()) {
    const totals = calculateDraftTotals(state);

    if (state.docType === "Invoice") {
      collectedDeposits += totals.deposit;
      if (totals.balanceDue > 0.01) {
        openInvoices++;
        outstandingBalance += totals.balanceDue;
        if (state.client.dueDate && state.client.dueDate < today) {
          overdueInvoices++;
        }
      } else {
        closedInvoices++;
      }
    } else if (state.docType === "Quote") {
      quotePipeline += totals.grandTotal;
    }
  }

  const documentsBinCount = db.records.filter(
    (record) => record.binId === "documents"
  ).length;
  const quotesBinCount = db.records.filter(
    (record) => record.binId === "quotes"
  ).length;
  const invoiceDraftCount = [...draftStates.values()].filter(
    (state) => state.docType === "Invoice"
  ).length;
  const quoteDraftCount = [...draftStates.values()].filter(
    (state) => state.docType === "Quote"
  ).length;

  const clientRecords = db.records.filter((record) => record.binId === "clients");
  const newClients = clientRecords.filter(
    (record) => new Date(record.createdAt) >= thirtyDaysAgo
  ).length;

  const recentActivity = db.records
    .filter((record) =>
      ["documents", "quotes", "drafts", "clients"].includes(record.binId)
    )
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
    .slice(0, 6)
    .map((record) => {
      const state = parseDraftState(record);
      const totals = state ? calculateDraftTotals(state) : null;
      const type = state?.docType ?? activityTypeForBin(record.binId, record.data);

      return {
        id: record.id,
        label: record.label,
        type: type as AdminDashboardActivity["type"],
        date: record.updatedAt,
        amount: totals
          ? type === "Invoice"
            ? totals.balanceDue
            : totals.grandTotal
          : null,
      };
    });

  return {
    openInvoices,
    closedInvoices,
    overdueInvoices,
    totalQuotes: Math.max(quotesBinCount, quoteDraftCount),
    totalInvoices: Math.max(documentsBinCount, invoiceDraftCount),
    newClients,
    totalClients: clientRecords.length,
    outstandingBalance,
    quotePipeline,
    activeDrafts: draftStates.size,
    collectedDeposits,
    recentActivity,
  };
}
