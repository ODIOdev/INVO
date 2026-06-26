import { NextResponse } from "next/server";
import {
  bulkUpsertRecords,
  parseBinId,
} from "@/lib/storage/internalDatabase";

export async function POST(request: Request) {
  const body = await request.json();
  const records = Array.isArray(body.records) ? body.records : [];

  const valid = records.filter(
    (r: { binId?: string; data?: unknown }) =>
      r.binId && parseBinId(r.binId) && r.data
  );

  const result = await bulkUpsertRecords(
    valid.map((r: {
      id?: string;
      binId: string;
      data: Record<string, unknown>;
      label?: string;
      source?: "invoice-app" | "admin-demo" | "sync";
    }) => ({
      id: r.id,
      binId: parseBinId(r.binId)!,
      data: r.data,
      label: r.label,
      source: r.source ?? "sync",
    }))
  );

  return NextResponse.json({
    upserted: result.upserted,
    lastSyncedAt: new Date().toISOString(),
  });
}
