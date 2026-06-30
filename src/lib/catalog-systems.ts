import type { StoredRecord } from "@/lib/storage/dataBins";

export type CatalogSystem = {
  id: string;
  title: string;
  description: string;
  hours: number;
  rate: number;
};

export function isCatalogSystemRecord(record: StoredRecord): boolean {
  if (record.data.catalog === true) return true;
  return record.id.startsWith("catalog-system-");
}

export function parseCatalogSystem(
  record: StoredRecord
): CatalogSystem | null {
  if (!isCatalogSystemRecord(record)) return null;

  const data = record.data;
  const title = String(data.title ?? data.laborTitle ?? "").trim();
  if (!title) return null;

  return {
    id: record.id,
    title,
    description: String(data.description ?? ""),
    hours: Number(data.hours ?? data.laborHours) || 1,
    rate: Number(data.rate ?? data.laborRate) || 0,
  };
}

export function catalogSystemsFromRecords(
  records: StoredRecord[]
): CatalogSystem[] {
  return records
    .map(parseCatalogSystem)
    .filter((item): item is CatalogSystem => item !== null)
    .sort((a, b) => a.title.localeCompare(b.title));
}
