import { NextResponse } from "next/server";
import {
  getDeletedRecords,
  purgeAllDeletedRecords,
} from "@/lib/storage/internalDatabase";

export async function GET() {
  const deleted = await getDeletedRecords();
  return NextResponse.json({ deleted });
}

export async function DELETE() {
  const removed = await purgeAllDeletedRecords();
  return NextResponse.json({ success: true, removed });
}
