import { NextResponse } from "next/server";
import { requireStorageScope } from "@/lib/storage/storage-auth";
import {
  purgeDeletedRecord,
  restoreDeletedRecord,
} from "@/lib/storage/internalDatabase";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const scopeResult = await requireStorageScope();
  if (scopeResult instanceof NextResponse) return scopeResult;

  const { id } = await context.params;
  const restored = await restoreDeletedRecord(scopeResult, id);

  if (!restored) {
    return NextResponse.json({ error: "Record not found in trash" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const scopeResult = await requireStorageScope();
  if (scopeResult instanceof NextResponse) return scopeResult;

  const { id } = await context.params;
  const purged = await purgeDeletedRecord(scopeResult, id);

  if (!purged) {
    return NextResponse.json({ error: "Record not found in trash" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
