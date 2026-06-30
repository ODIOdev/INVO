import {
  calculateDraftTotals,
  formatMoney,
  getTodayDate,
  type DraftState,
} from "@/lib/drafts";
import {
  docIdFromStoredRecord,
  resolveStateFromDocumentRecord,
  clientCatalogFromRecord,
} from "@/lib/client-balances";
import { isDirectoryClientRecord } from "@/lib/catalog-clients";
import {
  getDocumentListRowMeta,
  type DocumentListStatus,
} from "@/lib/document-list-meta";
import { readDatabase } from "@/lib/storage/internalDatabase";
import type { StoredRecord } from "@/lib/storage/dataBins";
import {
  belongsToScope,
  type StorageScope,
} from "@/lib/storage/storage-scope";

export type AdminDashboardActivity = {
  id: string;
  label: string;
  type: "Invoice" | "Quote" | "Client" | "Draft";
  date: string;
  metaLine: string;
  status: DocumentListStatus | "Client" | null;
  amount: number | null;
  amountLabel: string | null;
};

export type AdminDashboardStats = {
  openInvoices: number;
  closedInvoices: number;
  overdueInvoices: number;
  openBalance: number;
  closedBalance: number;
  overdueBalance: number;
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

function recordPriority(record: StoredRecord): number {
  if (record.binId === "documents" || record.binId === "quotes") return 3;
  if (record.binId === "drafts") return 2;
  return 1;
}

function bestStatesByDocId(
  records: StoredRecord[],
  docType: DraftState["docType"]
): Map<string, DraftState> {
  const best = new Map<string, { state: DraftState; priority: number }>();

  for (const record of records) {
    if (
      record.binId !== "drafts" &&
      record.binId !== "documents" &&
      record.binId !== "quotes"
    ) {
      continue;
    }

    const state = resolveStateFromDocumentRecord(record);
    if (!state || state.docType !== docType) continue;

    const docId = docIdFromStoredRecord(record);
    if (!docId) continue;

    const priority = recordPriority(record);
    const existing = best.get(docId);
    if (!existing || priority > existing.priority) {
      best.set(docId, { state, priority });
    }
  }

  return new Map(
    [...best.entries()].map(([docId, entry]) => [docId, entry.state])
  );
}

function activityTypeForRecord(
  record: StoredRecord,
  state: DraftState | null
): AdminDashboardActivity["type"] {
  if (record.binId === "clients") return "Client";
  if (state?.docType === "Quote") return "Quote";
  if (record.binId === "drafts") return "Draft";
  if (record.binId === "quotes") return "Quote";
  return "Invoice";
}

function buildActivityFromRecord(record: StoredRecord): AdminDashboardActivity {
  const state = resolveStateFromDocumentRecord(record);
  const type = activityTypeForRecord(record, state);
  const date = record.updatedAt;

  if (record.binId === "clients") {
    const catalog = clientCatalogFromRecord(record);
    const metaParts = [
      catalog.companyName || null,
      catalog.email || null,
      catalog.phone || null,
    ].filter(Boolean);

    return {
      id: record.id,
      label: record.label,
      type: "Client",
      date,
      metaLine:
        metaParts.length > 0 ? metaParts.join(" · ") : "Client profile updated",
      status: "Client",
      amount: null,
      amountLabel: null,
    };
  }

  const rowMeta = getDocumentListRowMeta(record);
  const totals = state ? calculateDraftTotals(state) : null;

  let amount: number | null = null;
  let amountLabel: string | null = null;

  if (totals) {
    if (type === "Invoice") {
      if (rowMeta.status === "Closed") {
        amount = totals.grandTotal;
        amountLabel = "Paid in full";
      } else {
        amount = totals.balanceDue;
        amountLabel = "Balance due";
      }
    } else {
      amount = totals.grandTotal;
      amountLabel = type === "Quote" ? "Quote total" : "Draft total";
    }
  }

  let metaLine = rowMeta.metaLine;
  if (type === "Invoice" && totals) {
    const extras: string[] = [];
    if (totals.deposit > 0) {
      extras.push(`Deposit ${formatMoney(totals.deposit)}`);
    }
    if (totals.amountPaid > 0) {
      extras.push(`Received ${formatMoney(totals.amountPaid)}`);
    }
    if (extras.length > 0) {
      metaLine = `${metaLine} · ${extras.join(" · ")}`;
    }
  }

  return {
    id: record.id,
    label: record.label,
    type,
    date,
    metaLine,
    status: rowMeta.status,
    amount,
    amountLabel,
  };
}

function dedupeActivityRecords(records: StoredRecord[]): StoredRecord[] {
  const best = new Map<string, StoredRecord>();

  for (const record of records) {
    if (record.binId === "clients") {
      if (!isDirectoryClientRecord(record)) continue;
      best.set(record.id, record);
      continue;
    }

    const docId = docIdFromStoredRecord(record);
    const key = docId ?? record.id;
    const existing = best.get(key);
    if (!existing) {
      best.set(key, record);
      continue;
    }

    const recordTime = new Date(record.updatedAt).getTime();
    const existingTime = new Date(existing.updatedAt).getTime();
    if (
      recordTime > existingTime ||
      (recordTime === existingTime &&
        recordPriority(record) > recordPriority(existing))
    ) {
      best.set(key, record);
    }
  }

  return [...best.values()];
}

export async function getAdminDashboardStats(
  scope: StorageScope
): Promise<AdminDashboardStats> {
  const db = await readDatabase();
  const records = db.records.filter((record) => belongsToScope(record, scope));
  const today = getTodayDate();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const invoiceStates = bestStatesByDocId(records, "Invoice");
  const quoteStates = bestStatesByDocId(records, "Quote");

  let openInvoices = 0;
  let closedInvoices = 0;
  let overdueInvoices = 0;
  let openBalance = 0;
  let closedBalance = 0;
  let overdueBalance = 0;
  let collectedDeposits = 0;

  for (const state of invoiceStates.values()) {
    const totals = calculateDraftTotals(state);
    collectedDeposits += totals.deposit;

    if (totals.balanceDue > 0.01) {
      openInvoices++;
      openBalance += totals.balanceDue;
      if (state.client.dueDate && state.client.dueDate < today) {
        overdueInvoices++;
        overdueBalance += totals.balanceDue;
      }
    } else {
      closedInvoices++;
      closedBalance += totals.grandTotal;
    }
  }

  let quotePipeline = 0;
  for (const state of quoteStates.values()) {
    quotePipeline += calculateDraftTotals(state).grandTotal;
  }

  const clientRecords = records.filter(isDirectoryClientRecord);
  const newClients = clientRecords.filter(
    (record) => new Date(record.createdAt) >= thirtyDaysAgo
  ).length;

  const activeDrafts = records.filter((record) => record.binId === "drafts").length;

  const recentActivity = dedupeActivityRecords(
    records.filter((record) =>
      ["documents", "quotes", "drafts", "clients"].includes(record.binId)
    )
  )
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
    .slice(0, 8)
    .map(buildActivityFromRecord);

  return {
    openInvoices,
    closedInvoices,
    overdueInvoices,
    openBalance,
    closedBalance,
    overdueBalance,
    totalQuotes: quoteStates.size,
    totalInvoices: invoiceStates.size,
    newClients,
    totalClients: clientRecords.length,
    outstandingBalance: openBalance,
    quotePipeline,
    activeDrafts,
    collectedDeposits,
    recentActivity,
  };
}
