import {
  buildRecordLabel,
  type BinSummary,
  type DataBinId,
  type DatabaseSchema,
  DATA_BINS,
  type DeletedRecord,
  isDataBinId,
  type StoredRecord,
} from "./dataBins";
import {
  attachDocumentHistoryToClients,
  ensureDirectoryClientLinks,
  pruneDocumentSnapshotClients,
} from "@/lib/client-balances";
import { isCatalogLineItemRecord } from "@/lib/catalog-line-items";
import { isDirectoryClientRecord } from "@/lib/catalog-clients";
import {
  belongsToScope,
  recordProfileId,
  type StorageScope,
} from "@/lib/storage/storage-scope";
import {
  emptyDatabase,
  loadDatabase,
  saveDatabase,
} from "./databaseStore";

export type { StorageScope } from "@/lib/storage/storage-scope";

export async function readDatabase(): Promise<DatabaseSchema> {
  return loadDatabase();
}

async function writeDatabase(db: DatabaseSchema): Promise<void> {
  pruneDocumentSnapshotClients(db);
  ensureDirectoryClientLinks(db);
  attachDocumentHistoryToClients(db);
  await saveDatabase(db);
}

function filterBinRecords(
  records: StoredRecord[],
  binId: DataBinId
): StoredRecord[] {
  return records.filter((record) => {
    if (record.binId !== binId) return false;
    if (binId === "lineItems") return isCatalogLineItemRecord(record);
    if (binId === "clients") return isDirectoryClientRecord(record);
    return true;
  });
}

function scopedRecords(
  db: DatabaseSchema,
  scope: StorageScope
): StoredRecord[] {
  return db.records.filter((record) => belongsToScope(record, scope));
}

function scopedDeletedRecords(
  db: DatabaseSchema,
  scope: StorageScope
): DeletedRecord[] {
  return db.deletedRecords.filter((entry) =>
    belongsToScope(entry.record, scope)
  );
}

export async function getBinSummaries(
  scope: StorageScope
): Promise<BinSummary[]> {
  const db = await readDatabase();
  const records = scopedRecords(db, scope);

  return (Object.keys(DATA_BINS) as DataBinId[]).map((binId) => {
    const binRecords = filterBinRecords(records, binId);
    const lastUpdated =
      binRecords.length > 0
        ? binRecords.reduce(
            (latest, record) =>
              record.updatedAt > latest ? record.updatedAt : latest,
            binRecords[0].updatedAt
          )
        : null;

    return {
      binId,
      label: DATA_BINS[binId].label,
      description: DATA_BINS[binId].description,
      icon: DATA_BINS[binId].icon,
      count: binRecords.length,
      lastUpdated,
    };
  });
}

export async function getRecordsByBin(
  scope: StorageScope,
  binId: DataBinId
): Promise<StoredRecord[]> {
  const db = await readDatabase();
  return filterBinRecords(scopedRecords(db, scope), binId).sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export async function getRecordById(
  scope: StorageScope,
  id: string
): Promise<StoredRecord | null> {
  const db = await readDatabase();
  const record = db.records.find((entry) => entry.id === id) ?? null;
  if (!record || !belongsToScope(record, scope)) return null;
  return record;
}

export async function upsertRecord(
  scope: StorageScope,
  input: {
    id?: string;
    binId: DataBinId;
    data: Record<string, unknown>;
    label?: string;
    source?: StoredRecord["source"];
  }
): Promise<StoredRecord> {
  const db = await readDatabase();
  const now = new Date().toISOString();
  const id = input.id ?? crypto.randomUUID();
  const label = input.label ?? buildRecordLabel(input.binId, input.data);
  const source = input.source ?? "invoice-app";

  const existingIndex = db.records.findIndex((record) => record.id === id);
  if (existingIndex >= 0 && !belongsToScope(db.records[existingIndex], scope)) {
    throw new Error("Record not found.");
  }

  const record: StoredRecord = {
    id,
    binId: input.binId,
    label,
    data: input.data,
    source,
    profileId: scope.profileId,
    createdAt:
      existingIndex >= 0 ? db.records[existingIndex].createdAt : now,
    updatedAt: now,
  };

  if (existingIndex >= 0) {
    db.records[existingIndex] = record;
  } else {
    db.records.push(record);
  }

  await writeDatabase(db);
  return record;
}

export async function deleteRecord(
  scope: StorageScope,
  id: string
): Promise<boolean> {
  const db = await readDatabase();
  const index = db.records.findIndex((record) => record.id === id);
  if (index < 0) return false;
  if (!belongsToScope(db.records[index], scope)) return false;

  const [record] = db.records.splice(index, 1);
  const deletedAt = new Date().toISOString();

  db.deletedRecords = db.deletedRecords.filter(
    (entry) => entry.record.id !== id
  );
  db.deletedRecords.unshift({ record, deletedAt });

  if (db.deletedRecords.length > 200) {
    db.deletedRecords = db.deletedRecords.slice(0, 200);
  }

  await writeDatabase(db);
  return true;
}

export async function getDeletedRecords(
  scope: StorageScope
): Promise<DeletedRecord[]> {
  const db = await readDatabase();
  return scopedDeletedRecords(db, scope).sort(
    (a, b) =>
      new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime()
  );
}

export async function restoreDeletedRecord(
  scope: StorageScope,
  id: string
): Promise<boolean> {
  const db = await readDatabase();
  const index = db.deletedRecords.findIndex((entry) => entry.record.id === id);
  if (index < 0) return false;
  if (!belongsToScope(db.deletedRecords[index].record, scope)) return false;

  const [entry] = db.deletedRecords.splice(index, 1);
  const existingIndex = db.records.findIndex((record) => record.id === id);

  if (existingIndex >= 0) {
    db.records[existingIndex] = entry.record;
  } else {
    db.records.push(entry.record);
  }

  await writeDatabase(db);
  return true;
}

export async function purgeDeletedRecord(
  scope: StorageScope,
  id: string
): Promise<boolean> {
  const db = await readDatabase();
  const next = db.deletedRecords.filter(
    (entry) =>
      entry.record.id !== id || !belongsToScope(entry.record, scope)
  );
  if (next.length === db.deletedRecords.length) return false;
  db.deletedRecords = next;
  await writeDatabase(db);
  return true;
}

export async function purgeAllDeletedRecords(
  scope: StorageScope
): Promise<number> {
  const db = await readDatabase();
  const remaining = db.deletedRecords.filter(
    (entry) => !belongsToScope(entry.record, scope)
  );
  const removed = db.deletedRecords.length - remaining.length;
  if (removed === 0) return 0;
  db.deletedRecords = remaining;
  await writeDatabase(db);
  return removed;
}

export async function clearBin(
  scope: StorageScope,
  binId: DataBinId
): Promise<number> {
  const db = await readDatabase();
  const before = db.records.length;
  db.records = db.records.filter(
    (record) =>
      record.binId !== binId || !belongsToScope(record, scope)
  );
  const removed = before - db.records.length;
  if (removed > 0) await writeDatabase(db);
  return removed;
}

export async function resetDatabase(scope: StorageScope): Promise<void> {
  const db = await readDatabase();
  db.records = db.records.filter((record) => !belongsToScope(record, scope));
  db.deletedRecords = db.deletedRecords.filter(
    (entry) => !belongsToScope(entry.record, scope)
  );
  await writeDatabase(db);
}

function recordBelongsToDocument(record: StoredRecord, docId: string): boolean {
  if (
    record.id === `draft-${docId}` ||
    record.id === `doc-${docId}` ||
    record.id === `quote-${docId}` ||
    record.id === `client-${docId}` ||
    record.id === `labor-${docId}` ||
    record.id === `notes-${docId}` ||
    record.id.startsWith(`line-${docId}-`)
  ) {
    return true;
  }

  return (
    record.data.documentId === docId ||
    record.data.draftId === docId
  );
}

export async function getRecordsForDocument(
  scope: StorageScope,
  docId: string
): Promise<StoredRecord[]> {
  const db = await readDatabase();
  return scopedRecords(db, scope).filter((record) =>
    recordBelongsToDocument(record, docId)
  );
}

export async function deleteDocumentBundle(
  scope: StorageScope,
  docId: string
): Promise<number> {
  const db = await readDatabase();
  const toDelete = scopedRecords(db, scope).filter((record) =>
    recordBelongsToDocument(record, docId)
  );
  if (toDelete.length === 0) return 0;

  const deletedAt = new Date().toISOString();
  const ids = new Set(toDelete.map((record) => record.id));
  db.records = db.records.filter((record) => !ids.has(record.id));

  for (const record of toDelete) {
    db.deletedRecords = db.deletedRecords.filter(
      (entry) => entry.record.id !== record.id
    );
    db.deletedRecords.unshift({ record, deletedAt });
  }

  if (db.deletedRecords.length > 200) {
    db.deletedRecords = db.deletedRecords.slice(0, 200);
  }

  await writeDatabase(db);
  return toDelete.length;
}

function purgeStaleDocumentRecords(
  db: DatabaseSchema,
  scope: StorageScope,
  docId: string,
  incomingIds: Set<string>
): void {
  db.records = db.records.filter((record) => {
    if (!belongsToScope(record, scope)) return true;
    if (!recordBelongsToDocument(record, docId)) return true;

    const isCoreRecord =
      record.id === `draft-${docId}` ||
      record.id === `doc-${docId}` ||
      record.id === `quote-${docId}` ||
      record.id === `client-${docId}`;

    if (isCoreRecord) return true;

    return incomingIds.has(record.id);
  });
}

export async function bulkUpsertRecords(
  scope: StorageScope,
  records: Array<{
    id?: string;
    binId: DataBinId;
    data: Record<string, unknown>;
    label?: string;
    source?: StoredRecord["source"];
  }>,
  options?: {
    draftOnlyDocIds?: string[];
    stripClientDocIds?: string[];
    stripDraftDocIds?: string[];
  }
): Promise<{ upserted: number }> {
  const db = await readDatabase();
  const now = new Date().toISOString();
  let upserted = 0;

  const docIds = new Set<string>();
  for (const input of records) {
    if (input.id?.startsWith("draft-")) {
      docIds.add(input.id.replace("draft-", ""));
    }
    if (input.data.draftId) docIds.add(String(input.data.draftId));
    if (input.data.documentId) docIds.add(String(input.data.documentId));
  }

  const incomingIds = new Set(
    records.map((record) => record.id).filter(Boolean) as string[]
  );

  for (const docId of docIds) {
    purgeStaleDocumentRecords(db, scope, docId, incomingIds);
  }

  for (const input of records) {
    const id = input.id ?? crypto.randomUUID();
    const existingIndex = db.records.findIndex((record) => record.id === id);
    if (
      existingIndex >= 0 &&
      !belongsToScope(db.records[existingIndex], scope)
    ) {
      continue;
    }

    const record: StoredRecord = {
      id,
      binId: input.binId,
      label: input.label ?? buildRecordLabel(input.binId, input.data),
      data: input.data,
      source: input.source ?? "sync",
      profileId: scope.profileId,
      createdAt:
        existingIndex >= 0 ? db.records[existingIndex].createdAt : now,
      updatedAt: now,
    };

    if (existingIndex >= 0) {
      db.records[existingIndex] = record;
    } else {
      db.records.push(record);
    }
    upserted++;
  }

  for (const docId of docIds) {
    const incomingDoc = incomingIds.has(`doc-${docId}`);
    const incomingQuote = incomingIds.has(`quote-${docId}`);
    if (incomingDoc) {
      db.records = db.records.filter(
        (record) =>
          record.id !== `quote-${docId}` ||
          !belongsToScope(record, scope)
      );
    }
    if (incomingQuote) {
      db.records = db.records.filter(
        (record) =>
          record.id !== `doc-${docId}` || !belongsToScope(record, scope)
      );
    }
  }

  if (options?.draftOnlyDocIds?.length) {
    const draftOnly = new Set(options.draftOnlyDocIds);
    db.records = db.records.filter((record) => {
      if (!belongsToScope(record, scope)) return true;
      for (const docId of draftOnly) {
        if (
          recordBelongsToDocument(record, docId) &&
          record.id !== `draft-${docId}`
        ) {
          return false;
        }
      }
      return true;
    });
  }

  if (options?.stripClientDocIds?.length) {
    const stripClients = new Set(options.stripClientDocIds);
    db.records = db.records.filter((record) => {
      if (!belongsToScope(record, scope)) return true;
      for (const docId of stripClients) {
        if (record.id === `client-${docId}`) return false;
      }
      return true;
    });
  }

  if (options?.stripDraftDocIds?.length) {
    const stripDrafts = new Set(options.stripDraftDocIds);
    db.records = db.records.filter((record) => {
      if (!belongsToScope(record, scope)) return true;
      for (const docId of stripDrafts) {
        if (record.id === `draft-${docId}`) return false;
      }
      return true;
    });
  }

  db.lastSyncedAt = now;
  await writeDatabase(db);
  return { upserted };
}

export async function getDatabaseStats(scope: StorageScope) {
  const db = await readDatabase();
  const summaries = await getBinSummaries(scope);
  const documentCount = scopedRecords(db, scope).filter(
    (record) => record.binId === "documents"
  ).length;

  return {
    totalRecords: documentCount,
    lastSyncedAt: db.lastSyncedAt,
    bins: summaries,
  };
}

export function parseBinId(value: string): DataBinId | null {
  return isDataBinId(value) ? value : null;
}

export { emptyDatabase, getStorageBackend } from "./databaseStore";
export { recordProfileId } from "@/lib/storage/storage-scope";
