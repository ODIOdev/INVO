import {
  buildRecordLabel,
  type BinSummary,
  type DataBinId,
  type DatabaseSchema,
  DATA_BINS,
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
  const next = db.records.filter((r) => r.id !== id);
  if (next.length === db.records.length) return false;
  db.records = next;
  await writeDatabase(db);
  return true;
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

export async function bulkUpsertRecords(
  records: Array<{
    id?: string;
    binId: DataBinId;
    data: Record<string, unknown>;
    label?: string;
    source?: StoredRecord["source"];
  }>
): Promise<{ upserted: number }> {
  const db = await readDatabase();
  const now = new Date().toISOString();
  let upserted = 0;

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
