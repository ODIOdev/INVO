import {
  calculateDraftTotals,
  getTodayDate,
  type ClientInfo,
  type DraftState,
} from "@/lib/drafts";
import {
  clientDirectoryDataFromClientInfo,
  isDirectoryClientRecord,
  isDocumentLinkedClientSnapshot,
  isNamedClient,
} from "@/lib/catalog-clients";
import { buildRecordLabel, type DatabaseSchema, type StoredRecord } from "@/lib/storage/dataBins";
import { recordProfileId } from "@/lib/storage/storage-scope";

export type ClientCatalogData = {
  clientName: string;
  companyName: string;
  email: string;
  phone: string;
  url: string;
  profileImage: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zipCode: string;
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
  docId: string;
  docType: "Invoice" | "Quote";
  documentNumber: string;
  projectName: string;
  issueDate: string;
  dueDate: string;
  amount: number;
  balanceDue: number;
  status: "Open" | "Closed" | "Overdue" | "Quote" | "Draft";
  updatedAt: string;
};

const DOCUMENT_BINS = new Set(["drafts", "documents", "quotes"]);

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

export function docIdFromStoredRecord(record: StoredRecord): string | null {
  if (record.data.draftId) return String(record.data.draftId);
  if (record.data.documentId) return String(record.data.documentId);

  const match = record.id.match(/^(?:doc|quote|draft)-(.+)$/);
  return match?.[1] ?? null;
}

export function clientCatalogFromRecord(record: StoredRecord): ClientCatalogData {
  return {
    clientName: (record.data.clientName as string) || "",
    companyName: (record.data.companyName as string) || "",
    email: (record.data.email as string) || "",
    phone: (record.data.phone as string) || "",
    url: (record.data.url as string) || "",
    profileImage: (record.data.profileImage as string) || "",
    addressLine1: (record.data.addressLine1 as string) || "",
    addressLine2: (record.data.addressLine2 as string) || "",
    city: (record.data.city as string) || "",
    state: (record.data.state as string) || "",
    zipCode: (record.data.zipCode as string) || "",
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

function clientInfoFromDocumentData(
  docData: Record<string, unknown>
): ClientInfo {
  const snapshot =
    docData.clientSnapshot && typeof docData.clientSnapshot === "object"
      ? (docData.clientSnapshot as Record<string, unknown>)
      : {};

  return {
    clientName: String(docData.clientName ?? snapshot.clientName ?? ""),
    companyName: String(docData.companyName ?? snapshot.companyName ?? ""),
    email: String(docData.email ?? snapshot.email ?? ""),
    phone: String(docData.phone ?? snapshot.phone ?? ""),
    url: String(docData.url ?? snapshot.url ?? ""),
    addressLine1: String(docData.addressLine1 ?? snapshot.addressLine1 ?? ""),
    addressLine2: String(docData.addressLine2 ?? snapshot.addressLine2 ?? ""),
    city: String(docData.city ?? snapshot.city ?? ""),
    state: String(
      docData.clientState ?? snapshot.state ?? ""
    ),
    zipCode: String(docData.zipCode ?? snapshot.zipCode ?? ""),
    projectName: String(docData.projectName ?? ""),
    documentNumber: String(docData.documentNumber ?? ""),
    issueDate: String(docData.issueDate ?? ""),
    dueDate: String(docData.dueDate ?? ""),
  };
}

export function resolveStateFromDocumentRecord(
  record: StoredRecord
): DraftState | null {
  if (record.data.state && typeof record.data.state === "object") {
    const state = record.data.state as DraftState;
    return {
      ...state,
      catalogClientId:
        state.catalogClientId ??
        (record.data.catalogClientId
          ? String(record.data.catalogClientId)
          : undefined),
    };
  }

  if (record.binId === "drafts") {
    const state = record.data.state;
    if (!state || typeof state !== "object") return null;
    return state as DraftState;
  }

  if (record.binId === "documents" || record.binId === "quotes") {
    const docData = record.data;
    const docType: DraftState["docType"] =
      docData.docType === "Quote" ? "Quote" : "Invoice";

    return {
      docType,
      taxRate: Number(docData.taxRate ?? 8),
      client: clientInfoFromDocumentData(docData),
      services: [
        { id: 1, service: "", description: "", quantity: 1, unitPrice: 0 },
      ],
      laborTitle: "",
      laborHours: 0,
      laborRate: 0,
      deposit: Number(docData.deposit ?? 0),
      amountPaid: Number(docData.amountPaid ?? 0),
      notes: "",
      catalogClientId: docData.catalogClientId
        ? String(docData.catalogClientId)
        : undefined,
    };
  }

  return null;
}

function recordPriority(record: StoredRecord): number {
  if (record.binId === "documents" || record.binId === "quotes") return 3;
  if (record.binId === "drafts") return 2;
  return 1;
}

function resolveDocumentStatus(
  state: DraftState,
  record: StoredRecord,
  today: string
): ClientDocumentRow["status"] {
  if (record.binId === "drafts") return "Draft";

  if (state.docType === "Quote") return "Quote";

  const totals = calculateDraftTotals(state);
  if (totals.balanceDue > 0.01) {
    return state.client.dueDate && state.client.dueDate < today
      ? "Overdue"
      : "Open";
  }

  return "Closed";
}

export function buildClientDocumentRow(
  record: StoredRecord,
  state: DraftState
): ClientDocumentRow | null {
  const docId = docIdFromStoredRecord(record);
  if (!docId) return null;

  const today = getTodayDate();
  const totals = calculateDraftTotals(state);

  return {
    id: record.id,
    docId,
    docType: state.docType,
    documentNumber: state.client.documentNumber || "—",
    projectName: state.client.projectName || "—",
    issueDate: state.client.issueDate,
    dueDate: state.client.dueDate,
    amount: totals.grandTotal,
    balanceDue: totals.balanceDue,
    status: resolveDocumentStatus(state, record, today),
    updatedAt: record.updatedAt,
  };
}

function parseStoredDocumentLink(raw: unknown): ClientDocumentRow | null {
  if (!raw || typeof raw !== "object") return null;

  const entry = raw as Record<string, unknown>;
  const docType = entry.docType === "Quote" ? "Quote" : "Invoice";
  const status = entry.status;

  return {
    id: String(entry.recordId ?? entry.id ?? entry.docId ?? ""),
    docId: String(entry.docId ?? ""),
    docType,
    documentNumber: String(entry.documentNumber ?? "—"),
    projectName: String(entry.projectName ?? "—"),
    issueDate: String(entry.issueDate ?? ""),
    dueDate: String(entry.dueDate ?? ""),
    amount: Number(entry.amount ?? 0),
    balanceDue: Number(entry.balanceDue ?? 0),
    status:
      status === "Open" ||
      status === "Closed" ||
      status === "Overdue" ||
      status === "Quote" ||
      status === "Draft"
        ? status
        : docType === "Quote"
          ? "Quote"
          : "Closed",
    updatedAt: String(entry.updatedAt ?? ""),
  };
}

function documentHistoryFromClient(
  clientRecord: StoredRecord | null | undefined
): ClientDocumentRow[] {
  if (!clientRecord?.data.documentHistory) return [];

  const history = clientRecord.data.documentHistory;
  if (!Array.isArray(history)) return [];

  return history
    .map(parseStoredDocumentLink)
    .filter((row): row is ClientDocumentRow => Boolean(row?.docId));
}

function mergeDocumentRows(
  liveRows: ClientDocumentRow[],
  storedRows: ClientDocumentRow[]
): ClientDocumentRow[] {
  const byDocId = new Map<string, ClientDocumentRow>();

  for (const row of storedRows) {
    byDocId.set(row.docId, row);
  }

  for (const row of liveRows) {
    byDocId.set(row.docId, row);
  }

  return [...byDocId.values()].sort((a, b) => {
    const aTime = new Date(a.issueDate || a.updatedAt).getTime();
    const bTime = new Date(b.issueDate || b.updatedAt).getTime();
    return bTime - aTime;
  });
}

function collectLiveClientDocuments(
  catalog: ClientCatalogData,
  documentRecords: StoredRecord[]
): ClientDocumentRow[] {
  const bestRecordByDocId = new Map<string, StoredRecord>();

  for (const record of documentRecords) {
    if (!DOCUMENT_BINS.has(record.binId)) continue;

    const state = resolveStateFromDocumentRecord(record);
    if (!state || !matchesClient(catalog, state.client)) continue;

    const docId = docIdFromStoredRecord(record);
    if (!docId) continue;

    const existing = bestRecordByDocId.get(docId);
    if (!existing || recordPriority(record) > recordPriority(existing)) {
      bestRecordByDocId.set(docId, record);
    }
  }

  const rows: ClientDocumentRow[] = [];
  for (const record of bestRecordByDocId.values()) {
    const state = resolveStateFromDocumentRecord(record);
    if (!state) continue;
    const row = buildClientDocumentRow(record, state);
    if (row) rows.push(row);
  }

  return rows;
}

export function getClientDocuments(
  catalog: ClientCatalogData,
  documentRecords: StoredRecord[],
  clientRecord?: StoredRecord | null
): ClientDocumentRow[] {
  const liveRows = collectLiveClientDocuments(catalog, documentRecords);
  const storedRows = documentHistoryFromClient(clientRecord);
  return mergeDocumentRows(liveRows, storedRows);
}

export function resolveClientDocumentRecord(
  doc: ClientDocumentRow,
  documentRecords: StoredRecord[]
): StoredRecord | null {
  const candidateIds = new Set(
    [
      doc.id,
      doc.docId,
      `doc-${doc.docId}`,
      `quote-${doc.docId}`,
      `draft-${doc.docId}`,
    ].filter(Boolean)
  );

  for (const record of documentRecords) {
    if (candidateIds.has(record.id)) return record;

    const recordDocId = docIdFromStoredRecord(record);
    if (recordDocId && recordDocId === doc.docId) return record;
  }

  return null;
}

export function computeClientBalanceStats(
  catalog: ClientCatalogData,
  documentRecords: StoredRecord[],
  clientRecord?: StoredRecord | null
): ClientBalanceStats {
  const today = getTodayDate();
  let openBalance = 0;
  let closedBalance = 0;
  let overdueBalance = 0;
  let openCount = 0;
  let closedCount = 0;
  let overdueCount = 0;

  for (const doc of getClientDocuments(catalog, documentRecords, clientRecord)) {
    if (doc.docType !== "Invoice") continue;
    if (doc.status === "Draft" || doc.status === "Quote") continue;

    if (doc.balanceDue > 0.01) {
      openBalance += doc.balanceDue;
      openCount++;
      if (doc.dueDate && doc.dueDate < today) {
        overdueBalance += doc.balanceDue;
        overdueCount++;
      }
    } else {
      closedBalance += doc.amount;
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

export function pruneDocumentSnapshotClients(db: DatabaseSchema): void {
  db.records = db.records.filter(
    (record) => !isDocumentLinkedClientSnapshot(record)
  );
}

export function ensureDirectoryClientLinks(db: DatabaseSchema): void {
  const now = new Date().toISOString();
  const directoryClients = db.records.filter(isDirectoryClientRecord);

  for (const record of db.records) {
    if (
      record.binId !== "documents" &&
      record.binId !== "quotes" &&
      record.binId !== "drafts"
    ) {
      continue;
    }

    const state = resolveStateFromDocumentRecord(record);
    if (!state || !isNamedClient(state.client)) continue;

    const recordScope = recordProfileId(record);
    const profileDirectoryClients = directoryClients.filter(
      (client) => recordProfileId(client) === recordScope
    );

    const embeddedState = record.data.state as DraftState | undefined;
    const catalogClientId = String(
      record.data.catalogClientId ??
        embeddedState?.catalogClientId ??
        state.catalogClientId ??
        ""
    ).trim();

    let target = catalogClientId
      ? profileDirectoryClients.find((client) => client.id === catalogClientId)
      : undefined;

    if (!target) {
      target = profileDirectoryClients.find((client) =>
        matchesClient(clientCatalogFromRecord(client), state.client)
      );
    }

    if (!target) {
      const id = `client-catalog-${crypto.randomUUID()}`;
      target = {
        id,
        binId: "clients",
        label: buildRecordLabel(
          "clients",
          clientDirectoryDataFromClientInfo(state.client)
        ),
        data: clientDirectoryDataFromClientInfo(state.client),
        source: record.source,
        profileId: recordScope,
        createdAt: now,
        updatedAt: now,
      };
      db.records.push(target);
      directoryClients.push(target);
    }

    record.data.catalogClientId = target.id;
    if (embeddedState) {
      embeddedState.catalogClientId = target.id;
      record.data.state = embeddedState;
    }
  }
}

export function attachDocumentHistoryToClients(db: DatabaseSchema): void {
  for (const record of db.records) {
    if (record.binId !== "documents" && record.binId !== "quotes") continue;

    const state = resolveStateFromDocumentRecord(record);
    if (!state) continue;

    const link = buildClientDocumentRow(record, state);
    if (!link) continue;

    for (const clientRecord of db.records) {
      if (clientRecord.binId !== "clients") continue;
      if (isDocumentLinkedClientSnapshot(clientRecord)) continue;
      if (!isDirectoryClientRecord(clientRecord)) continue;
      if (recordProfileId(clientRecord) !== recordProfileId(record)) continue;

      const catalog = clientCatalogFromRecord(clientRecord);
      if (!matchesClient(catalog, state.client)) continue;

      const history = Array.isArray(clientRecord.data.documentHistory)
        ? clientRecord.data.documentHistory.filter(
            (entry) =>
              entry &&
              typeof entry === "object" &&
              String((entry as Record<string, unknown>).docId ?? "") !== link.docId
          )
        : [];

      clientRecord.data.documentHistory = [
        {
          docId: link.docId,
          recordId: link.id,
          docType: link.docType,
          documentNumber: link.documentNumber,
          projectName: link.projectName,
          issueDate: link.issueDate,
          dueDate: link.dueDate,
          amount: link.amount,
          balanceDue: link.balanceDue,
          status: link.status,
          updatedAt: link.updatedAt,
        },
        ...history,
      ];
      clientRecord.updatedAt = link.updatedAt;
    }
  }
}

export function isDocumentRecord(record: StoredRecord): boolean {
  return DOCUMENT_BINS.has(record.binId);
}
