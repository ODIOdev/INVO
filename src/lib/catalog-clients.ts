import type { ClientInfo } from "@/lib/drafts";
import type { StoredRecord } from "@/lib/storage/dataBins";

export type CatalogClient = {
  id: string;
  clientName: string;
  companyName: string;
  email: string;
  phone: string;
  url: string;
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
  };
}

export function catalogClientsFromRecords(
  records: StoredRecord[]
): CatalogClient[] {
  const seen = new Set<string>();

  return records
    .filter(isNamedClientRecord)
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
): Pick<ClientInfo, "clientName" | "companyName" | "email" | "phone" | "url"> {
  return {
    clientName: client.clientName,
    companyName: client.companyName,
    email: client.email,
    phone: client.phone,
    url: client.url,
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
