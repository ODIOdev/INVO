import type { AdminIconName } from "@/lib/admin-icons";
import type { StoredAdminProfile } from "@/lib/admin-profiles";
import type { StoredMasterAccount } from "@/lib/admin-account";

export const DATA_BINS = {
  clients: {
    id: "clients",
    label: "Clients",
    description: "Client names, companies, contact info, and URLs",
    icon: "clients" as AdminIconName,
  },
  documents: {
    id: "documents",
    label: "Invoices",
    description: "Completed invoice documents",
    icon: "documents" as AdminIconName,
  },
  quotes: {
    id: "quotes",
    label: "Quotes",
    description: "Saved quote documents from the invoice app",
    icon: "quotes" as AdminIconName,
  },
  drafts: {
    id: "drafts",
    label: "Drafts",
    description: "Saved draft states from the invoice editor",
    icon: "drafts" as AdminIconName,
  },
  lineItems: {
    id: "lineItems",
    label: "Line Items",
    description: "Service catalog — saved line items and prices",
    icon: "lineItems" as AdminIconName,
  },
  labor: {
    id: "labor",
    label: "Systems | Applications",
    description: "Systems and application catalog entries",
    icon: "labor" as AdminIconName,
  },
  notes: {
    id: "notes",
    label: "Notes & Terms",
    description: "Payment terms and project notes",
    icon: "notes" as AdminIconName,
  },
} as const;

export type DataBinId = keyof typeof DATA_BINS;

export interface StoredRecord {
  id: string;
  binId: DataBinId;
  label: string;
  data: Record<string, unknown>;
  source: "invoice-app" | "admin-demo" | "sync";
  profileId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeletedRecord {
  record: StoredRecord;
  deletedAt: string;
}

export interface DatabaseSchema {
  version: number;
  records: StoredRecord[];
  deletedRecords: DeletedRecord[];
  adminProfiles?: StoredAdminProfile[];
  masterAccount?: StoredMasterAccount;
  lastSyncedAt: string | null;
}

export interface BinSummary {
  binId: DataBinId;
  label: string;
  description: string;
  icon: AdminIconName;
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
    case "quotes":
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
