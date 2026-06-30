import { NextResponse } from "next/server";
import { requireStorageScope } from "@/lib/storage/storage-auth";
import {
  getDeletedRecords,
  purgeAllDeletedRecords,
} from "@/lib/storage/internalDatabase";

export async function GET() {
  const scopeResult = await requireStorageScope();
  if (scopeResult instanceof NextResponse) return scopeResult;

  const deleted = await getDeletedRecords(scopeResult);
  return NextResponse.json({ deleted });
}

export async function DELETE() {
  const scopeResult = await requireStorageScope();
  if (scopeResult instanceof NextResponse) return scopeResult;

  const removed = await purgeAllDeletedRecords(scopeResult);
  return NextResponse.json({ success: true, removed });
}
