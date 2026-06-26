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

export async function deleteStoredRecord(id: string) {
  const response = await fetch(`/api/storage/records/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete record");
  return response.json();
}

export async function runAppInitSync(): Promise<SyncResult | null> {
  if (typeof window === "undefined") return null;

  const { listDrafts } = await import("@/lib/drafts");
  const drafts = listDrafts();
  if (drafts.length === 0) return null;

  try {
    return await syncToInternalDatabase({ drafts });
  } catch {
    return null;
  }
}
