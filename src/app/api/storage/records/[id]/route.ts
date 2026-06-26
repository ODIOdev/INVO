import { NextResponse } from "next/server";
import {
  deleteRecord,
  getRecordById,
} from "@/lib/storage/internalDatabase";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const record = await getRecordById(id);

  if (!record) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 });
  }

  return NextResponse.json({ record });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const deleted = await deleteRecord(id);

  if (!deleted) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
