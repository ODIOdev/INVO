import { NextResponse } from "next/server";
import { resetDatabase } from "@/lib/storage/internalDatabase";

export async function POST() {
  await resetDatabase();
  return NextResponse.json({ success: true });
}
