import { NextResponse } from "next/server";
import { recordsFromImportCsv } from "@/lib/csv-export";
import { requireStorageScope } from "@/lib/storage/storage-auth";
import { bulkUpsertRecords } from "@/lib/storage/internalDatabase";

export async function POST(request: Request) {
  const scopeResult = await requireStorageScope();
  if (scopeResult instanceof NextResponse) return scopeResult;

  const csv = await request.text();

  if (!csv.trim()) {
    return NextResponse.json({ error: "CSV file is empty." }, { status: 400 });
  }

  try {
    const records = recordsFromImportCsv(csv);

    if (records.length === 0) {
      return NextResponse.json(
        { error: "No valid records found in CSV." },
        { status: 400 }
      );
    }

    const result = await bulkUpsertRecords(scopeResult, records);

    return NextResponse.json({
      imported: result.upserted,
      lastSyncedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to import CSV";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
