import { NextResponse } from "next/server";
import { buildCsvExport, csvFilename } from "@/lib/csv-export";
import {
  isDataBinId,
  type DataBinId,
} from "@/lib/storage/dataBins";
import { requireStorageScope } from "@/lib/storage/storage-auth";
import { readDatabase } from "@/lib/storage/internalDatabase";
import { belongsToScope } from "@/lib/storage/storage-scope";

export async function GET(request: Request) {
  const scopeResult = await requireStorageScope();
  if (scopeResult instanceof NextResponse) return scopeResult;

  const { searchParams } = new URL(request.url);
  const binParam = searchParams.get("bin") ?? "all";

  let binId: DataBinId | "all" = "all";
  if (binParam !== "all") {
    if (!isDataBinId(binParam)) {
      return NextResponse.json({ error: "Invalid bin id." }, { status: 400 });
    }
    binId = binParam;
  }

  const db = await readDatabase();
  const records = db.records.filter((record) =>
    belongsToScope(record, scopeResult)
  );
  const csv = buildCsvExport(records, binId);
  const filename = csvFilename(binId);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
