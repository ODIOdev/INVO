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
  emptyDatabase,
  loadDatabase,
  saveDatabase,
} from "./databaseStore";

export async function readDatabase(): Promise<DatabaseSchema> {
  return loadDatabase();
}

async function writeDatabase(db: DatabaseSchema): Promise<void> {
  await saveDatabase(db);
}

export async function getBinSummaries(): Promise<BinSummary[]> {
  const db = await readDatabase();
  return (Object.keys(DATA_BINS) as DataBinId[]).map((binId) => {
    const binRecords = db.records.filter((r) => r.binId === binId);
    const lastUpdated =
      binRecords.length > 0
        ? binRecords.reduce(
            (latest, r) => (r.updatedAt > latest ? r.updatedAt : latest),
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

export async function getRecordsByBin(binId: DataBinId): Promise<StoredRecord[]> {
  const db = await readDatabase();
  return db.records
    .filter((r) => r.binId === binId)
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
}

export async function getRecordById(id: string): Promise<StoredRecord | null> {
  const db = await readDatabase();
  return db.records.find((r) => r.id === id) ?? null;
}

export async function upsertRecord(input: {
  id?: string;
  binId: DataBinId;
  data: Record<string, unknown>;
  label?: string;
  source?: StoredRecord["source"];
}): Promise<StoredRecord> {
  const db = await readDatabase();
  const now = new Date().toISOString();
  const id = input.id ?? crypto.randomUUID();
  const label = input.label ?? buildRecordLabel(input.binId, input.data);
  const source = input.source ?? "invoice-app";

  const existingIndex = db.records.findIndex((r) => r.id === id);
  const record: StoredRecord = {
    id,
    binId: input.binId,
    label,
    data: input.data,
    source,
    createdAt: existingIndex >= 0 ? db.records[existingIndex].createdAt : now,
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

export async function deleteRecord(id: string): Promise<boolean> {
  const db = await readDatabase();
  const index = db.records.findIndex((r) => r.id === id);
  if (index < 0) return false;

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

export async function getDeletedRecords(): Promise<DeletedRecord[]> {
  const db = await readDatabase();
  return [...db.deletedRecords].sort(
    (a, b) =>
      new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime()
  );
}

export async function restoreDeletedRecord(id: string): Promise<boolean> {
  const db = await readDatabase();
  const index = db.deletedRecords.findIndex((entry) => entry.record.id === id);
  if (index < 0) return false;

  const [entry] = db.deletedRecords.splice(index, 1);
  const existingIndex = db.records.findIndex((r) => r.id === id);

  if (existingIndex >= 0) {
    db.records[existingIndex] = entry.record;
  } else {
    db.records.push(entry.record);
  }

  await writeDatabase(db);
  return true;
}

export async function purgeDeletedRecord(id: string): Promise<boolean> {
  const db = await readDatabase();
  const next = db.deletedRecords.filter((entry) => entry.record.id !== id);
  if (next.length === db.deletedRecords.length) return false;
  db.deletedRecords = next;
  await writeDatabase(db);
  return true;
}

export async function purgeAllDeletedRecords(): Promise<number> {
  const db = await readDatabase();
  const removed = db.deletedRecords.length;
  if (removed === 0) return 0;
  db.deletedRecords = [];
  await writeDatabase(db);
  return removed;
}

export async function clearBin(binId: DataBinId): Promise<number> {
  const db = await readDatabase();
  const before = db.records.length;
  db.records = db.records.filter((r) => r.binId !== binId);
  const removed = before - db.records.length;
  if (removed > 0) await writeDatabase(db);
  return removed;
}

export async function resetDatabase(): Promise<void> {
  await writeDatabase(emptyDatabase());
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

export async function deleteDocumentBundle(docId: string): Promise<number> {
  const db = await readDatabase();
  const toDelete = db.records.filter((record) =>
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
  docId: string,
  incomingIds: Set<string>
): void {
  db.records = db.records.filter((record) => {
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
  records: Array<{
    id?: string;
    binId: DataBinId;
    data: Record<string, unknown>;
    label?: string;
    source?: StoredRecord["source"];
  }>,
  options?: { draftOnlyDocIds?: string[]; stripClientDocIds?: string[] }
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
    purgeStaleDocumentRecords(db, docId, incomingIds);
  }

  for (const input of records) {
    const id = input.id ?? crypto.randomUUID();
    const existingIndex = db.records.findIndex((r) => r.id === id);
    const record: StoredRecord = {
      id,
      binId: input.binId,
      label: input.label ?? buildRecordLabel(input.binId, input.data),
      data: input.data,
      source: input.source ?? "sync",
      createdAt: existingIndex >= 0 ? db.records[existingIndex].createdAt : now,
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
      db.records = db.records.filter((record) => record.id !== `quote-${docId}`);
    }
    if (incomingQuote) {
      db.records = db.records.filter((record) => record.id !== `doc-${docId}`);
    }
  }

  if (options?.draftOnlyDocIds?.length) {
    const draftOnly = new Set(options.draftOnlyDocIds);
    db.records = db.records.filter((record) => {
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
      for (const docId of stripClients) {
        if (record.id === `client-${docId}`) return false;
      }
      return true;
    });
  }

  db.lastSyncedAt = now;
  await writeDatabase(db);
  return { upserted };
}

export async function getDatabaseStats() {
  const db = await readDatabase();
  const summaries = await getBinSummaries();
  const documentCount = db.records.filter((r) => r.binId === "documents").length;

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
