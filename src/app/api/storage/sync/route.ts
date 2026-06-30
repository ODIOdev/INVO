import { NextResponse } from "next/server";
import { requireStorageScope } from "@/lib/storage/storage-auth";
import {
  bulkUpsertRecords,
  parseBinId,
} from "@/lib/storage/internalDatabase";

export async function POST(request: Request) {
  const scopeResult = await requireStorageScope();
  if (scopeResult instanceof NextResponse) return scopeResult;

  const body = await request.json();
  const records = Array.isArray(body.records) ? body.records : [];

  const valid = records.filter(
    (r: { binId?: string; data?: unknown }) =>
      r.binId && parseBinId(r.binId) && r.data
  );
  const draftOnlyDocIds = Array.isArray(body.draftOnlyDocIds)
    ? body.draftOnlyDocIds.filter((id: unknown) => typeof id === "string")
    : [];
  const stripClientDocIds = Array.isArray(body.stripClientDocIds)
    ? body.stripClientDocIds.filter((id: unknown) => typeof id === "string")
    : [];
  const stripDraftDocIds = Array.isArray(body.stripDraftDocIds)
    ? body.stripDraftDocIds.filter((id: unknown) => typeof id === "string")
    : [];

  const result = await bulkUpsertRecords(
    scopeResult,
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
    })),
    { draftOnlyDocIds, stripClientDocIds, stripDraftDocIds }
  );

  return NextResponse.json({
    upserted: result.upserted,
    lastSyncedAt: new Date().toISOString(),
  });
}
