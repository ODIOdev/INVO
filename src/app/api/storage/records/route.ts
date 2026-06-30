import { NextResponse } from "next/server";
import { requireStorageScope } from "@/lib/storage/storage-auth";
import {
  parseBinId,
  upsertRecord,
} from "@/lib/storage/internalDatabase";

export async function POST(request: Request) {
  const scopeResult = await requireStorageScope();
  if (scopeResult instanceof NextResponse) return scopeResult;

  const body = await request.json();
  const binId = parseBinId(body.binId ?? "");

  if (!binId || !body.data || typeof body.data !== "object") {
    return NextResponse.json({ error: "Invalid record payload" }, { status: 400 });
  }

  const record = await upsertRecord(scopeResult, {
    id: body.id,
    binId,
    data: body.data,
    label: body.label,
    source: body.source ?? "admin-demo",
  });

  return NextResponse.json({ record });
}
