import type { DraftState, SavedDraft } from "@/lib/drafts";
import { saveDraftToLibrary } from "@/lib/drafts";
import type { DataBinId, StoredRecord } from "./dataBins";

const OPEN_SUBMISSION_KEY = "overdrive-open-submission";
const ADMIN_RETURN_KEY = "overdrive-admin-return";

export interface SyncPayload {
  drafts?: SavedDraft[];
  document?: DraftState & { draftId?: string | null };
  source?: StoredRecord["source"];
  syncMode?: "draft" | "complete";
}

export interface SyncResult {
  upserted: number;
  lastSyncedAt: string;
}

export function primaryDocBinForDocType(
  docType: DraftState["docType"]
): "documents" | "quotes" {
  return docType === "Quote" ? "quotes" : "documents";
}

export function draftOnlySyncRecords(
  state: DraftState,
  draftId?: string | null,
  source: StoredRecord["source"] = "sync"
) {
  const docId = draftId ?? crypto.randomUUID();

  return [
    {
      id: `draft-${docId}`,
      binId: "drafts" as const,
      data: {
        draftId: docId,
        docType: state.docType,
        projectName: state.client.projectName,
        documentNumber: state.client.documentNumber,
        state,
      },
      source,
    },
  ];
}

export function draftStateToSyncRecords(
  state: DraftState,
  draftId?: string | null,
  source: StoredRecord["source"] = "sync",
  options?: { primaryDocBin?: "documents" | "quotes" }
) {
  const docId = draftId ?? crypto.randomUUID();
  const primaryDocBin =
    options?.primaryDocBin ?? primaryDocBinForDocType(state.docType);
  const primaryDocRecordId =
    primaryDocBin === "quotes" ? `quote-${docId}` : `doc-${docId}`;
  const records: Array<{
    id: string;
    binId: DataBinId;
    data: Record<string, unknown>;
    label?: string;
    source: StoredRecord["source"];
  }> = [];

  const clientSnapshot = {
    clientName: state.client.clientName,
    companyName: state.client.companyName,
    email: state.client.email,
    phone: state.client.phone,
    url: state.client.url,
    addressLine1: state.client.addressLine1,
    addressLine2: state.client.addressLine2,
    city: state.client.city,
    state: state.client.state,
    zipCode: state.client.zipCode,
  };

  records.push({
    id: primaryDocRecordId,
    binId: primaryDocBin,
    data: {
      docType: state.docType,
      documentNumber: state.client.documentNumber,
      projectName: state.client.projectName,
      issueDate: state.client.issueDate,
      dueDate: state.client.dueDate,
      taxRate: state.taxRate,
      deposit: state.deposit ?? 0,
      amountPaid: state.amountPaid ?? 0,
      draftId: docId,
      catalogClientId: state.catalogClientId ?? null,
      clientName: state.client.clientName,
      companyName: state.client.companyName,
      email: state.client.email,
      phone: state.client.phone,
      addressLine1: state.client.addressLine1,
      addressLine2: state.client.addressLine2,
      city: state.client.city,
      clientState: state.client.state,
      zipCode: state.client.zipCode,
      url: state.client.url,
      clientSnapshot,
      state,
    },
    source,
  });

  if (state.laborTitle || state.laborHours || state.laborRate) {
    records.push({
      id: `labor-${docId}`,
      binId: "labor",
      data: {
        title: state.laborTitle,
        hours: state.laborHours,
        rate: state.laborRate,
        documentId: docId,
      },
      source,
    });
  }

  if (state.notes.trim()) {
    records.push({
      id: `notes-${docId}`,
      binId: "notes",
      data: { notes: state.notes, documentId: docId },
      source,
    });
  }

  return records;
}

export function savedDraftsToSyncRecords(drafts: SavedDraft[]) {
  return drafts.flatMap((draft) =>
    draftOnlySyncRecords(draft.state, draft.id)
  );
}

export async function syncToInternalDatabase(
  payload: SyncPayload
): Promise<SyncResult> {
  const syncMode = payload.syncMode ?? "complete";
  const records: Array<{
    id: string;
    binId: DataBinId;
    data: Record<string, unknown>;
    label?: string;
    source: StoredRecord["source"];
  }> = [];
  const draftOnlyDocIds: string[] = [];
  const stripClientDocIds: string[] = [];
  const stripDraftDocIds: string[] = [];

  if (payload.drafts?.length) {
    records.push(...savedDraftsToSyncRecords(payload.drafts));
    for (const draft of payload.drafts) {
      draftOnlyDocIds.push(draft.id);
    }
  }

  if (payload.document) {
    const { draftId, ...state } = payload.document;
    const source = payload.source ?? "sync";

    if (syncMode === "draft") {
      const draftRecords = draftOnlySyncRecords(state, draftId, source);
      records.push(...draftRecords);
      draftOnlyDocIds.push(
        draftId ?? draftRecords[0].id.replace(/^draft-/, "")
      );
    } else {
      const docId = draftId ?? crypto.randomUUID();
      records.push(
        ...draftStateToSyncRecords(state, docId, source, {
          primaryDocBin: primaryDocBinForDocType(state.docType),
        })
      );
      stripClientDocIds.push(docId);
      stripDraftDocIds.push(docId);
    }
  }

  const response = await fetch("/api/storage/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({
      records,
      draftOnlyDocIds,
      stripClientDocIds,
      stripDraftDocIds,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to sync to internal database");
  }

  return response.json() as Promise<SyncResult>;
}

export async function fetchBinSummaries() {
  const response = await fetch("/api/storage/bins", { cache: "no-store" });
  if (!response.ok) throw new Error("Failed to load bins");
  return response.json();
}

export async function fetchBinRecords(binId: string) {
  const response = await fetch(`/api/storage/bins/${binId}`, {
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Failed to load bin records");
  return response.json();
}

export async function fetchRecordById(id: string) {
  const response = await fetch(`/api/storage/records/${id}`, {
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Failed to load record");
  return response.json() as Promise<{ record: StoredRecord }>;
}

function docIdFromRecord(record: StoredRecord): string | null {
  if (record.data.draftId) return String(record.data.draftId);
  if (record.data.documentId) return String(record.data.documentId);

  const match = record.id.match(/^(?:doc|quote|draft)-(.+)$/);
  return match?.[1] ?? null;
}

function clientInfoFromData(
  clientData: Record<string, unknown>,
  docData: Record<string, unknown>
): DraftState["client"] {
  const snapshot =
    docData.clientSnapshot && typeof docData.clientSnapshot === "object"
      ? (docData.clientSnapshot as Record<string, unknown>)
      : {};

  return {
    clientName: String(
      clientData.clientName ?? docData.clientName ?? snapshot.clientName ?? ""
    ),
    companyName: String(
      clientData.companyName ?? docData.companyName ?? snapshot.companyName ?? ""
    ),
    email: String(clientData.email ?? docData.email ?? snapshot.email ?? ""),
    phone: String(clientData.phone ?? docData.phone ?? snapshot.phone ?? ""),
    url: String(clientData.url ?? docData.url ?? snapshot.url ?? ""),
    addressLine1: String(
      clientData.addressLine1 ??
        docData.addressLine1 ??
        snapshot.addressLine1 ??
        ""
    ),
    addressLine2: String(
      clientData.addressLine2 ??
        docData.addressLine2 ??
        snapshot.addressLine2 ??
        ""
    ),
    city: String(clientData.city ?? docData.city ?? snapshot.city ?? ""),
    state: String(
      clientData.state ??
        docData.clientState ??
        snapshot.state ??
        ""
    ),
    zipCode: String(
      clientData.zipCode ?? docData.zipCode ?? snapshot.zipCode ?? ""
    ),
    projectName: String(docData.projectName ?? clientData.projectName ?? ""),
    documentNumber: String(docData.documentNumber ?? ""),
    issueDate: String(docData.issueDate ?? ""),
    dueDate: String(docData.dueDate ?? ""),
  };
}

export function reconstructDraftStateFromBundle(
  docId: string,
  docRecord: StoredRecord,
  bundle: StoredRecord[]
): DraftState | null {
  const docData = docRecord.data;
  const docType: DraftState["docType"] =
    docData.docType === "Quote" ? "Quote" : "Invoice";

  const clientRecord = bundle.find((entry) => entry.id === `client-${docId}`);
  const client = clientInfoFromData(clientRecord?.data ?? {}, docData);

  const lineRecords = bundle
    .filter(
      (entry) =>
        entry.id.startsWith(`line-${docId}-`) ||
        (entry.binId === "lineItems" && entry.data.documentId === docId)
    )
    .sort((a, b) => {
      const aSuffix = a.id.split("-").pop() ?? "0";
      const bSuffix = b.id.split("-").pop() ?? "0";
      return Number(aSuffix) - Number(bSuffix);
    });

  const services: DraftState["services"] = lineRecords.length
    ? lineRecords.map((entry, index) => ({
        id: Number(entry.data.id) || index + 1,
        service: String(entry.data.service ?? ""),
        description: String(entry.data.description ?? ""),
        quantity: Number(entry.data.quantity) || 1,
        unitPrice: Number(entry.data.unitPrice) || 0,
      }))
    : Array.isArray((docData.state as DraftState | undefined)?.services)
      ? ((docData.state as DraftState).services ?? [])
      : [];

  const laborRecord = bundle.find((entry) => entry.id === `labor-${docId}`);
  const notesRecord = bundle.find((entry) => entry.id === `notes-${docId}`);

  return {
    docType,
    taxRate: Number(docData.taxRate ?? 8),
    client,
    services: services.length
      ? services
      : [{ id: 1, service: "", description: "", quantity: 1, unitPrice: 0 }],
    laborTitle: String(laborRecord?.data.title ?? laborRecord?.data.laborTitle ?? ""),
    laborHours: Number(laborRecord?.data.hours ?? laborRecord?.data.laborHours ?? 0),
    laborRate: Number(laborRecord?.data.rate ?? laborRecord?.data.laborRate ?? 0),
    deposit: Number(docData.deposit ?? 0),
    amountPaid: Number(docData.amountPaid ?? 0),
    notes: String(notesRecord?.data.notes ?? ""),
    catalogClientId: docData.catalogClientId
      ? String(docData.catalogClientId)
      : undefined,
  };
}

export async function fetchDocumentBundle(docId: string): Promise<StoredRecord[]> {
  const response = await fetch(`/api/storage/documents/${docId}`, {
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Failed to load document bundle");
  const data = (await response.json()) as { records: StoredRecord[] };
  return data.records;
}

export async function resolveDraftStateForOpen(
  record: StoredRecord
): Promise<{ state: DraftState; draftId: string } | null> {
  const embeddedState = record.data.state;
  if (embeddedState && typeof embeddedState === "object") {
    const draftId = docIdFromRecord(record);
    if (!draftId) return null;
    return {
      state: embeddedState as DraftState,
      draftId,
    };
  }

  if (record.binId === "drafts" && record.data.state) {
    return {
      state: record.data.state as DraftState,
      draftId:
        (record.data.draftId as string) ||
        record.id.replace(/^draft-/, ""),
    };
  }

  const draftId = docIdFromRecord(record);
  if (!draftId) return null;

  try {
    const { record: draftRecord } = await fetchRecordById(`draft-${draftId}`);
    if (draftRecord?.data.state) {
      return {
        state: draftRecord.data.state as DraftState,
        draftId,
      };
    }
  } catch {
    // Draft was removed after finalize — reconstruct from related records.
  }

  if (record.binId === "documents" || record.binId === "quotes") {
    try {
      const bundle = await fetchDocumentBundle(draftId);
      const docRecord =
        bundle.find((entry) => entry.id === record.id) ?? record;
      const state = reconstructDraftStateFromBundle(draftId, docRecord, bundle);
      if (state) {
        return { state, draftId };
      }
    } catch {
      return null;
    }
  }

  return null;
}

export function storeAdminReturnPath(path?: string): void {
  if (typeof window === "undefined") return;
  const resolved =
    path ??
    `${window.location.pathname}${window.location.search}`;
  sessionStorage.setItem(ADMIN_RETURN_KEY, resolved);
}

export function getAdminReturnPath(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(ADMIN_RETURN_KEY);
}

export function clearAdminReturnPath(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(ADMIN_RETURN_KEY);
}

export async function openSubmissionInEditor(
  record: StoredRecord
): Promise<boolean> {
  const resolved = await resolveDraftStateForOpen(record);
  if (!resolved) return false;

  storeAdminReturnPath();
  sessionStorage.setItem(OPEN_SUBMISSION_KEY, JSON.stringify(resolved));
  saveDraftToLibrary(resolved.state, resolved.draftId);
  return true;
}

export function loadOpenedSubmission(): {
  state: DraftState;
  draftId: string;
} | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(OPEN_SUBMISSION_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(OPEN_SUBMISSION_KEY);
  try {
    return JSON.parse(raw) as { state: DraftState; draftId: string };
  } catch {
    return null;
  }
}

export async function finalizeCompletedInvoice(
  state: DraftState,
  draftId?: string | null
): Promise<{ draftId: string; savedToAdmin: boolean }> {
  const id = draftId ?? crypto.randomUUID();

  try {
    await syncToInternalDatabase({
      document: { ...state, draftId: id },
      source: "invoice-app",
      syncMode: "complete",
    });
    return { draftId: id, savedToAdmin: true };
  } catch {
    return { draftId: id, savedToAdmin: false };
  }
}

export async function finalizeCompletedQuote(
  state: DraftState,
  draftId?: string | null
): Promise<{ draftId: string; savedToAdmin: boolean }> {
  if (state.docType !== "Quote") {
    throw new Error("Only quotes can be saved to the Quotes bin.");
  }

  const id = draftId ?? crypto.randomUUID();

  try {
    await syncToInternalDatabase({
      document: { ...state, draftId: id },
      source: "invoice-app",
      syncMode: "complete",
    });
    return { draftId: id, savedToAdmin: true };
  } catch {
    return { draftId: id, savedToAdmin: false };
  }
}

export async function fetchServerDrafts(): Promise<SavedDraft[]> {
  const response = await fetch("/api/drafts", { cache: "no-store" });
  if (!response.ok) throw new Error("Failed to load cloud drafts");
  const data = (await response.json()) as { drafts: SavedDraft[] };
  return data.drafts;
}

export function mergeDraftLists(
  localDrafts: SavedDraft[],
  serverDrafts: SavedDraft[]
): SavedDraft[] {
  const merged = new Map<string, SavedDraft>();

  for (const draft of [...serverDrafts, ...localDrafts]) {
    const existing = merged.get(draft.id);
    if (!existing) {
      merged.set(draft.id, draft);
      continue;
    }

    const existingTime = new Date(existing.savedAt).getTime();
    const draftTime = new Date(draft.savedAt).getTime();
    if (draftTime >= existingTime) {
      merged.set(draft.id, draft);
    }
  }

  const byDocumentNumber = new Map<string, SavedDraft>();
  for (const draft of merged.values()) {
    const docNumber = draft.state.client.documentNumber.trim();
    if (!docNumber) {
      byDocumentNumber.set(draft.id, draft);
      continue;
    }

    const existing = byDocumentNumber.get(docNumber);
    if (!existing) {
      byDocumentNumber.set(docNumber, draft);
      continue;
    }

    const existingTime = new Date(existing.savedAt).getTime();
    const draftTime = new Date(draft.savedAt).getTime();
    if (draftTime >= existingTime) {
      byDocumentNumber.set(docNumber, draft);
    }
  }

  return Array.from(byDocumentNumber.values()).sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
  );
}

export async function loadAllDrafts(): Promise<SavedDraft[]> {
  const { listDrafts } = await import("@/lib/drafts");
  const localDrafts = listDrafts();

  try {
    const serverDrafts = await fetchServerDrafts();
    return mergeDraftLists(localDrafts, serverDrafts);
  } catch {
    return localDrafts;
  }
}

export async function deleteStoredRecord(id: string) {
  const response = await fetch(`/api/storage/records/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete record");
  return response.json();
}

export async function fetchDeletedRecords(): Promise<{
  deleted: import("@/lib/storage/dataBins").DeletedRecord[];
}> {
  const response = await fetch("/api/storage/trash", { cache: "no-store" });
  if (!response.ok) throw new Error("Failed to load deleted records");
  return response.json();
}

export async function downloadCsvExport(bin: DataBinId | "all" = "all"): Promise<void> {
  const response = await fetch(`/api/storage/export?bin=${bin}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to generate CSV export");
  }

  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition");
  const filename =
    disposition?.match(/filename="([^"]+)"/)?.[1] ?? `overdrive-export-${bin}.csv`;

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function uploadCsvImport(file: File): Promise<{ imported: number }> {
  const csv = await file.text();
  const response = await fetch("/api/storage/import", {
    method: "POST",
    headers: { "Content-Type": "text/csv; charset=utf-8" },
    body: csv,
  });

  const data = (await response.json().catch(() => ({}))) as {
    error?: string;
    imported?: number;
  };

  if (!response.ok) {
    throw new Error(data.error || "Failed to import CSV");
  }

  return { imported: data.imported ?? 0 };
}

export async function restoreDeletedRecord(id: string) {
  const response = await fetch(`/api/storage/trash/${id}`, {
    method: "POST",
  });
  if (!response.ok) throw new Error("Failed to restore record");
  return response.json();
}

export async function purgeDeletedRecord(id: string) {
  const response = await fetch(`/api/storage/trash/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to permanently delete record");
  return response.json();
}

export async function purgeAllDeletedRecords() {
  const response = await fetch("/api/storage/trash", {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to empty trash");
  return response.json() as Promise<{ removed: number }>;
}

export async function upsertStorageRecord(input: {
  binId: DataBinId;
  data: Record<string, unknown>;
  id?: string;
  label?: string;
  source?: StoredRecord["source"];
}) {
  const response = await fetch("/api/storage/records", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error("Failed to save record");
  return response.json() as Promise<{ record: StoredRecord }>;
}

export async function seedDemoDatabase(): Promise<SyncResult> {
  const { createDemoDraftState } = await import("@/lib/drafts");
  const demoId = crypto.randomUUID();
  const state = createDemoDraftState("Quote");

  return syncToInternalDatabase({
    document: { ...state, draftId: demoId },
    source: "admin-demo",
  });
}

export async function fetchStorageStatus(): Promise<{
  backend: "redis" | "local";
  cloud: boolean;
}> {
  const response = await fetch("/api/storage/status", { cache: "no-store" });
  if (!response.ok) throw new Error("Failed to load storage status");
  return response.json();
}

export async function masterResetDatabase(): Promise<void> {
  const response = await fetch("/api/storage/reset", { method: "POST" });
  if (!response.ok) throw new Error("Failed to reset database");

  const { clearAllDrafts } = await import("@/lib/drafts");
  clearAllDrafts();

  if (typeof window !== "undefined") {
    sessionStorage.removeItem("overdrive-open-submission");
    localStorage.removeItem("overdrive-invoice-draft");
  }
}

export async function deleteDraftEverywhere(id: string): Promise<void> {
  const { deleteDraft } = await import("@/lib/drafts");
  deleteDraft(id);

  const response = await fetch(`/api/storage/documents/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Failed to delete draft records");
  }
}

export async function pullServerDraftsToLocal(): Promise<number> {
  const { saveDraftToLibrary, listDrafts, clearAllDrafts } = await import(
    "@/lib/drafts"
  );
  const serverDrafts = await fetchServerDrafts();
  const merged = mergeDraftLists(listDrafts(), serverDrafts);

  clearAllDrafts();
  for (const draft of merged) {
    saveDraftToLibrary(draft.state, draft.id);
  }

  return merged.length;
}

export async function runAppInitSync(): Promise<SyncResult | null> {
  if (typeof window === "undefined") return null;

  try {
    const pulled = await pullServerDraftsToLocal();
    if (pulled > 0) {
      return {
        upserted: pulled,
        lastSyncedAt: new Date().toISOString(),
      };
    }
  } catch {
    // cloud may be unavailable locally
  }

  return null;
}
