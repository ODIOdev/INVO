import { NextResponse } from "next/server";
import { requireStorageScope } from "@/lib/storage/storage-auth";
import {
  getRecordsByBin,
  parseBinId,
} from "@/lib/storage/internalDatabase";
import { getBinMeta } from "@/lib/storage/dataBins";

type RouteContext = { params: Promise<{ binId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const scopeResult = await requireStorageScope();
  if (scopeResult instanceof NextResponse) return scopeResult;

  const { binId: rawBinId } = await context.params;
  const binId = parseBinId(rawBinId);

  if (!binId) {
    return NextResponse.json({ error: "Invalid bin ID" }, { status: 400 });
  }

  const records = await getRecordsByBin(scopeResult, binId);
  return NextResponse.json({
    bin: getBinMeta(binId),
    records,
  });
}
