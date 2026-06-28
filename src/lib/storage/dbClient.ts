import type { DraftState, SavedDraft } from "@/lib/drafts";
import { saveDraftToLibrary } from "@/lib/drafts";
import type { DataBinId, StoredRecord } from "./dataBins";

const OPEN_SUBMISSION_KEY = "overdrive-open-submission";

export interface SyncPayload {
  drafts?: SavedDraft[];
  document?: DraftState & { draftId?: string | null };
  source?: StoredRecord["source"];
}

export interface SyncResult {
  upserted: number;
  lastSyncedAt: string;
}

export function draftStateToSyncRecords(
  state: DraftState,
  draftId?: string | null,
  source: StoredRecord["source"] = "sync"
) {
  const docId = draftId ?? crypto.randomUUID();
  const records: Array<{
    id: string;
    binId: DataBinId;
    data: Record<string, unknown>;
    label?: string;
    source: StoredRecord["source"];
  }> = [];

  records.push({
    id: `client-${docId}`,
    binId: "clients",
    data: { ...state.client, documentId: docId },
    source,
  });

  records.push({
    id: `doc-${docId}`,
    binId: "documents",
    data: {
      docType: state.docType,
      documentNumber: state.client.documentNumber,
      projectName: state.client.projectName,
      issueDate: state.client.issueDate,
      dueDate: state.client.dueDate,
      taxRate: state.taxRate,
      deposit: state.deposit ?? 0,
      draftId: docId,
    },
    source,
  });

  records.push({
    id: `draft-${docId}`,
    binId: "drafts",
    data: {
      draftId: docId,
      docType: state.docType,
      projectName: state.client.projectName,
      documentNumber: state.client.documentNumber,
      state,
    },
    source,
  });

  state.services.forEach((service, index) => {
    records.push({
      id: `line-${docId}-${service.id ?? index}`,
      binId: "lineItems",
      data: { ...service, documentId: docId },
      source,
    });
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
    draftStateToSyncRecords(draft.state, draft.id)
  );
}

export async function syncToInternalDatabase(
  payload: SyncPayload
): Promise<SyncResult> {
  const records = [];

  if (payload.drafts?.length) {
    records.push(...savedDraftsToSyncRecords(payload.drafts));
  }

  if (payload.document) {
    const { draftId, ...state } = payload.document;
    records.push(
      ...draftStateToSyncRecords(state, draftId, payload.source ?? "sync")
    );
  }

  const response = await fetch("/api/storage/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ records }),
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

export async function resolveDraftStateForOpen(
  record: StoredRecord
): Promise<{ state: DraftState; draftId: string } | null> {
  if (record.binId === "drafts" && record.data.state) {
    return {
      state: record.data.state as DraftState,
      draftId:
        (record.data.draftId as string) ||
        record.id.replace(/^draft-/, ""),
    };
  }

  const draftId = (record.data.draftId ?? record.data.documentId) as
    | string
    | undefined;

  if (draftId) {
    try {
      const { record: draftRecord } = await fetchRecordById(`draft-${draftId}`);
      if (draftRecord?.data.state) {
        return {
          state: draftRecord.data.state as DraftState,
          draftId,
        };
      }
    } catch {
      return null;
    }
  }

  return null;
}

export async function openSubmissionInEditor(
  record: StoredRecord
): Promise<boolean> {
  const resolved = await resolveDraftStateForOpen(record);
  if (!resolved) return false;

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
  const id = saveDraftToLibrary(state, draftId);

  try {
    await syncToInternalDatabase({
      document: { ...state, draftId: id },
      source: "invoice-app",
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

  for (const draft of [...localDrafts, ...serverDrafts]) {
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

  return Array.from(merged.values()).sort(
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
  }
}

export async function deleteDraftEverywhere(id: string): Promise<void> {
  const { deleteDraft } = await import("@/lib/drafts");
  deleteDraft(id);

  const relatedIds = [
    `draft-${id}`,
    `doc-${id}`,
    `client-${id}`,
    `labor-${id}`,
    `notes-${id}`,
  ];

  await Promise.allSettled(
    relatedIds.map((recordId) => deleteStoredRecord(recordId))
  );
}

export async function pullServerDraftsToLocal(): Promise<number> {
  const { saveDraftToLibrary, listDrafts } = await import("@/lib/drafts");
  const serverDrafts = await fetchServerDrafts();
  const localIds = new Set(listDrafts().map((d) => d.id));
  let pulled = 0;

  for (const draft of serverDrafts) {
    if (!localIds.has(draft.id)) {
      saveDraftToLibrary(draft.state, draft.id);
      pulled++;
    }
  }

  return pulled;
}

export async function runAppInitSync(): Promise<SyncResult | null> {
  if (typeof window === "undefined") return null;

  try {
    await pullServerDraftsToLocal();
  } catch {
    // cloud may be unavailable locally
  }

  const { listDrafts } = await import("@/lib/drafts");
  const drafts = listDrafts();
  if (drafts.length === 0) return null;

  try {
    return await syncToInternalDatabase({ drafts });
  } catch {
    return null;
  }
}
