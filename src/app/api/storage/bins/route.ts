import { NextResponse } from "next/server";
import { requireStorageScope } from "@/lib/storage/storage-auth";
import { getBinSummaries, getDatabaseStats } from "@/lib/storage/internalDatabase";

export async function GET() {
  const scopeResult = await requireStorageScope();
  if (scopeResult instanceof NextResponse) return scopeResult;

  const [bins, stats] = await Promise.all([
    getBinSummaries(scopeResult),
    getDatabaseStats(scopeResult),
  ]);
  return NextResponse.json({ bins, stats });
}
