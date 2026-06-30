import type { StoredRecord } from "@/lib/storage/dataBins";

export type CatalogLineItem = {
  id: string;
  service: string;
  description: string;
  quantity: number;
  unitPrice: number;
};

export function isCatalogLineItemRecord(record: StoredRecord): boolean {
  if (record.data.documentId) return false;
  if (record.data.catalog === true) return true;
  return record.id.startsWith("catalog-line-");
}

export function parseCatalogLineItem(
  record: StoredRecord
): CatalogLineItem | null {
  if (!isCatalogLineItemRecord(record)) return null;

  const data = record.data;
  return {
    id: record.id,
    service: String(data.service ?? data.name ?? ""),
    description: String(data.description ?? ""),
    quantity: Number(data.quantity) || 1,
    unitPrice: Number(data.unitPrice) || 0,
  };
}

export function catalogLineItemsFromRecords(
  records: StoredRecord[]
): CatalogLineItem[] {
  return records
    .map(parseCatalogLineItem)
    .filter((item): item is CatalogLineItem => item !== null && item.service.trim() !== "")
    .sort((a, b) => a.service.localeCompare(b.service));
}
