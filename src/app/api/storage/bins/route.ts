import { NextResponse } from "next/server";
import { getBinSummaries, getDatabaseStats } from "@/lib/storage/internalDatabase";

export async function GET() {
  const [bins, stats] = await Promise.all([
    getBinSummaries(),
    getDatabaseStats(),
  ]);
  return NextResponse.json({ bins, stats });
}
