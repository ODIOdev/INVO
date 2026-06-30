import type { ClientInfo } from "@/lib/drafts";
import type { StoredRecord } from "@/lib/storage/dataBins";

export type CatalogClient = {
  id: string;
  clientName: string;
  companyName: string;
  email: string;
  phone: string;
  url: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zipCode: string;
};

export function isNamedClient(
  client: Pick<ClientInfo, "clientName" | "companyName" | "email">
): boolean {
  return Boolean(
    client.clientName.trim() ||
      client.companyName.trim() ||
      client.email.trim()
  );
}

export function isNamedClientRecord(record: StoredRecord): boolean {
  return isNamedClient({
    clientName: String(record.data.clientName ?? ""),
    companyName: String(record.data.companyName ?? ""),
    email: String(record.data.email ?? ""),
  });
}

/** Per-invoice client snapshots (client-{docId}) — not directory profiles. */
export function isDocumentLinkedClientSnapshot(
  record: StoredRecord
): boolean {
  if (record.binId !== "clients") return false;
  if (record.id.startsWith("client-catalog-")) return false;
  if (record.data.catalog === true) return false;

  return (
    record.id.startsWith("client-") &&
    Boolean(record.data.documentId ?? record.data.draftId)
  );
}

/** Canonical client directory entry shown in admin Clients. */
export function isDirectoryClientRecord(record: StoredRecord): boolean {
  if (record.binId !== "clients") return false;
  if (!isNamedClientRecord(record)) return false;
  return !isDocumentLinkedClientSnapshot(record);
}

export function clientDirectoryDataFromClientInfo(
  client: ClientInfo
): Record<string, unknown> {
  return {
    clientName: client.clientName.trim(),
    companyName: client.companyName.trim(),
    email: client.email.trim(),
    phone: client.phone.trim(),
    url: client.url.trim(),
    addressLine1: client.addressLine1.trim(),
    addressLine2: client.addressLine2.trim(),
    city: client.city.trim(),
    state: client.state.trim(),
    zipCode: client.zipCode.trim(),
    catalog: true,
  };
}

export function parseCatalogClient(
  record: StoredRecord
): CatalogClient | null {
  if (record.binId !== "clients") return null;

  const clientName = String(record.data.clientName ?? "").trim();
  if (!clientName) return null;

  return {
    id: record.id,
    clientName,
    companyName: String(record.data.companyName ?? ""),
    email: String(record.data.email ?? ""),
    phone: String(record.data.phone ?? ""),
    url: String(record.data.url ?? ""),
    addressLine1: String(record.data.addressLine1 ?? ""),
    addressLine2: String(record.data.addressLine2 ?? ""),
    city: String(record.data.city ?? ""),
    state: String(record.data.state ?? ""),
    zipCode: String(record.data.zipCode ?? ""),
  };
}

export function catalogClientsFromRecords(
  records: StoredRecord[]
): CatalogClient[] {
  const seen = new Set<string>();

  return records
    .filter(isDirectoryClientRecord)
    .map(parseCatalogClient)
    .filter((client): client is CatalogClient => {
      if (!client) return false;
      const key = client.clientName.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.clientName.localeCompare(b.clientName));
}

export function clientFieldsFromCatalog(
  client: CatalogClient
): Pick<
  ClientInfo,
  | "clientName"
  | "companyName"
  | "email"
  | "phone"
  | "url"
  | "addressLine1"
  | "addressLine2"
  | "city"
  | "state"
  | "zipCode"
> {
  return {
    clientName: client.clientName,
    companyName: client.companyName,
    email: client.email,
    phone: client.phone,
    url: client.url,
    addressLine1: client.addressLine1,
    addressLine2: client.addressLine2,
    city: client.city,
    state: client.state,
    zipCode: client.zipCode,
  };
}

export function filterCatalogClients(
  clients: CatalogClient[],
  query: string,
  limit = 8
): CatalogClient[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return clients.slice(0, limit);

  return clients
    .filter(
      (client) =>
        client.clientName.toLowerCase().includes(trimmed) ||
        client.companyName.toLowerCase().includes(trimmed) ||
        client.email.toLowerCase().includes(trimmed)
    )
    .slice(0, limit);
}
