import { NextResponse } from "next/server";
import { requireStorageScope } from "@/lib/storage/storage-auth";
import { resetDatabase } from "@/lib/storage/internalDatabase";

export async function POST() {
  const scopeResult = await requireStorageScope();
  if (scopeResult instanceof NextResponse) return scopeResult;

  await resetDatabase(scopeResult);
  return NextResponse.json({ success: true });
}
