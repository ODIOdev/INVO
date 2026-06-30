import { calculateDraftTotals, type DraftState } from "@/lib/drafts";
import { isCatalogLineItemRecord } from "@/lib/catalog-line-items";
import {
  DATA_BINS,
  type DataBinId,
  type StoredRecord,
} from "@/lib/storage/dataBins";

export function escapeCsvCell(value: unknown): string {
  const text = value == null ? "" : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function rowsToCsv(headers: string[], rows: string[][]): string {
  const lines = [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((row) => row.map(escapeCsvCell).join(",")),
  ];
  return `\uFEFF${lines.join("\r\n")}`;
}

export function csvFilename(binId: DataBinId | "all" = "all"): string {
  const date = new Date().toISOString().slice(0, 10);
  if (binId === "all") return `overdrive-export-all-${date}.csv`;

  const slug =
    binId === "labor"
      ? "systems-applications"
      : binId.replace(/([A-Z])/g, "-$1").toLowerCase();

  return `overdrive-${slug}-${date}.csv`;
}

export function parseCsv(content: string): string[][] {
  const text = content.replace(/^\uFEFF/, "").trim();
  if (!text) return [];

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char === "\r") {
      // ignore
    } else {
      cell += char;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

export function recordsFromImportCsv(
  csv: string
): Array<{
  id: string;
  binId: DataBinId;
  data: Record<string, unknown>;
  label?: string;
  source?: StoredRecord["source"];
}> {
  const rows = parseCsv(csv);
  if (rows.length < 2) return [];

  const headers = rows[0].map((header) => header.trim());
  const idIndex = headers.indexOf("id");
  const binIndex = headers.indexOf("bin");
  const labelIndex = headers.indexOf("label");
  const sourceIndex = headers.indexOf("source");
  const dataIndex = headers.indexOf("dataJson");

  if (idIndex < 0 || binIndex < 0 || dataIndex < 0) {
    throw new Error(
      "CSV must include id, bin, and dataJson columns from an Over Drive export."
    );
  }

  const imported: Array<{
    id: string;
    binId: DataBinId;
    data: Record<string, unknown>;
    label?: string;
    source?: StoredRecord["source"];
  }> = [];

  for (const row of rows.slice(1)) {
    const id = row[idIndex]?.trim();
    const binId = row[binIndex]?.trim();
    const dataJson = row[dataIndex]?.trim();

    if (!id || !binId || !dataJson) continue;
    if (!(binId in DATA_BINS)) continue;

    let data: Record<string, unknown>;
    try {
      data = JSON.parse(dataJson) as Record<string, unknown>;
    } catch {
      continue;
    }

    const sourceValue = row[sourceIndex]?.trim();
    const source =
      sourceValue === "invoice-app" ||
      sourceValue === "admin-demo" ||
      sourceValue === "sync"
        ? sourceValue
        : "sync";

    imported.push({
      id,
      binId: binId as DataBinId,
      data,
      label: row[labelIndex]?.trim() || undefined,
      source,
    });
  }

  return imported;
}

function draftStateFromRecord(data: Record<string, unknown>): DraftState | null {
  const state = data.state;
  if (!state || typeof state !== "object") return null;
  return state as DraftState;
}

function recordRow(
  record: StoredRecord,
  fields: string[]
): string[] {
  const data = record.data;
  return fields.map((field) => {
    switch (field) {
      case "id":
        return record.id;
      case "label":
        return record.label;
      case "source":
        return record.source;
      case "createdAt":
        return record.createdAt;
      case "updatedAt":
        return record.updatedAt;
      default:
        return String(data[field] ?? "");
    }
  });
}

function clientsCsv(records: StoredRecord[]): string {
  const headers = [
    "id",
    "clientName",
    "companyName",
    "email",
    "phone",
    "url",
    "source",
    "createdAt",
    "updatedAt",
  ];
  const rows = records.map((record) => recordRow(record, headers));
  return rowsToCsv(headers, rows);
}

function documentsCsv(records: StoredRecord[]): string {
  const headers = [
    "id",
    "docType",
    "documentNumber",
    "projectName",
    "issueDate",
    "dueDate",
    "taxRate",
    "deposit",
    "source",
    "createdAt",
    "updatedAt",
  ];
  const rows = records.map((record) => recordRow(record, headers));
  return rowsToCsv(headers, rows);
}

function draftsCsv(records: StoredRecord[]): string {
  const headers = [
    "id",
    "docType",
    "documentNumber",
    "projectName",
    "clientName",
    "clientEmail",
    "grandTotal",
    "balanceDue",
    "source",
    "createdAt",
    "updatedAt",
  ];
  const rows = records.map((record) => {
    const state = draftStateFromRecord(record.data);
    const totals = state ? calculateDraftTotals(state) : null;

    return [
      record.id,
      String(record.data.docType ?? state?.docType ?? ""),
      String(record.data.documentNumber ?? state?.client.documentNumber ?? ""),
      String(record.data.projectName ?? state?.client.projectName ?? ""),
      String(state?.client.clientName ?? ""),
      String(state?.client.email ?? ""),
      totals ? totals.grandTotal.toFixed(2) : "",
      totals ? totals.balanceDue.toFixed(2) : "",
      record.source,
      record.createdAt,
      record.updatedAt,
    ];
  });
  return rowsToCsv(headers, rows);
}

function lineItemsCsv(records: StoredRecord[]): string {
  const headers = [
    "id",
    "service",
    "description",
    "quantity",
    "unitPrice",
    "lineTotal",
    "catalog",
    "source",
    "createdAt",
    "updatedAt",
  ];
  const rows = records.map((record) => {
    const quantity = Number(record.data.quantity) || 1;
    const unitPrice = Number(record.data.unitPrice) || 0;
    return [
      record.id,
      String(record.data.service ?? record.data.name ?? ""),
      String(record.data.description ?? ""),
      String(quantity),
      unitPrice.toFixed(2),
      (quantity * unitPrice).toFixed(2),
      String(Boolean(record.data.catalog)),
      record.source,
      record.createdAt,
      record.updatedAt,
    ];
  });
  return rowsToCsv(headers, rows);
}

function laborCsv(records: StoredRecord[]): string {
  const headers = [
    "id",
    "title",
    "description",
    "hours",
    "rate",
    "lineTotal",
    "catalog",
    "source",
    "createdAt",
    "updatedAt",
  ];
  const rows = records.map((record) => {
    const hours = Number(record.data.hours ?? record.data.laborHours) || 0;
    const rate = Number(record.data.rate ?? record.data.laborRate) || 0;
    return [
      record.id,
      String(record.data.title ?? record.data.laborTitle ?? ""),
      String(record.data.description ?? ""),
      String(hours),
      rate.toFixed(2),
      (hours * rate).toFixed(2),
      String(Boolean(record.data.catalog)),
      record.source,
      record.createdAt,
      record.updatedAt,
    ];
  });
  return rowsToCsv(headers, rows);
}

function notesCsv(records: StoredRecord[]): string {
  const headers = [
    "id",
    "notes",
    "documentId",
    "source",
    "createdAt",
    "updatedAt",
  ];
  const rows = records.map((record) => [
    record.id,
    String(record.data.notes ?? ""),
    String(record.data.documentId ?? ""),
    record.source,
    record.createdAt,
    record.updatedAt,
  ]);
  return rowsToCsv(headers, rows);
}

function allRecordsCsv(records: StoredRecord[]): string {
  const headers = [
    "id",
    "bin",
    "binLabel",
    "label",
    "source",
    "createdAt",
    "updatedAt",
    "dataJson",
  ];
  const rows = records.map((record) => [
    record.id,
    record.binId,
    DATA_BINS[record.binId].label,
    record.label,
    record.source,
    record.createdAt,
    record.updatedAt,
    JSON.stringify(record.data),
  ]);
  return rowsToCsv(headers, rows);
}

export function buildCsvExport(
  records: StoredRecord[],
  binId: DataBinId | "all"
): string {
  if (binId === "all") return allRecordsCsv(records);

  const filtered = records.filter((record) => record.binId === binId);

  switch (binId) {
    case "clients":
      return clientsCsv(filtered);
    case "documents":
    case "quotes":
      return documentsCsv(filtered);
    case "drafts":
      return draftsCsv(filtered);
    case "lineItems":
      return lineItemsCsv(filtered.filter(isCatalogLineItemRecord));
    case "labor":
      return laborCsv(filtered);
    case "notes":
      return notesCsv(filtered);
    default:
      return allRecordsCsv(filtered);
  }
}
