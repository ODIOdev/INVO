export const DATA_BINS = {
  clients: {
    id: "clients",
    label: "Clients",
    description: "Client names, companies, contact info, and URLs",
    icon: "👤",
  },
  documents: {
    id: "documents",
    label: "Quotes & Invoices",
    description: "Complete quote and invoice documents",
    icon: "📄",
  },
  drafts: {
    id: "drafts",
    label: "Drafts",
    description: "Saved draft states from the invoice editor",
    icon: "📝",
  },
  lineItems: {
    id: "lineItems",
    label: "Line Items",
    description: "Individual service rows from documents",
    icon: "📋",
  },
  labor: {
    id: "labor",
    label: "Labor",
    description: "Labor entries — hours, rates, and titles",
    icon: "⏱",
  },
  notes: {
    id: "notes",
    label: "Notes & Terms",
    description: "Payment terms and project notes",
    icon: "💬",
  },
} as const;

export type DataBinId = keyof typeof DATA_BINS;

export interface StoredRecord {
  id: string;
  binId: DataBinId;
  label: string;
  data: Record<string, unknown>;
  source: "invoice-app" | "admin-demo" | "sync";
  createdAt: string;
  updatedAt: string;
}

export interface DatabaseSchema {
  version: number;
  records: StoredRecord[];
  lastSyncedAt: string | null;
}

export interface BinSummary {
  binId: DataBinId;
  label: string;
  description: string;
  icon: string;
  count: number;
  lastUpdated: string | null;
}

export function isDataBinId(value: string): value is DataBinId {
  return value in DATA_BINS;
}

export function getBinMeta(binId: DataBinId) {
  return DATA_BINS[binId];
}

export function buildRecordLabel(
  binId: DataBinId,
  data: Record<string, unknown>
): string {
  switch (binId) {
    case "clients":
      return (
        (data.clientName as string) ||
        (data.companyName as string) ||
        (data.email as string) ||
        "Unnamed client"
      );
    case "documents":
      return (
        `${data.docType ?? "Document"} — ${data.documentNumber ?? "No number"}`
      );
    case "drafts":
      return (
        (data.projectName as string) ||
        (data.documentNumber as string) ||
        "Untitled draft"
      );
    case "lineItems":
      return (data.service as string) || (data.name as string) || "Line item";
    case "labor":
      return (data.title as string) || (data.laborTitle as string) || "Labor entry";
    case "notes":
      return ((data.notes as string) || "Notes").slice(0, 48);
    default:
      return "Record";
  }
}
