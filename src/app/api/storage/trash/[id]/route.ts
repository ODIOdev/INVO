import { NextResponse } from "next/server";
import {
  purgeDeletedRecord,
  restoreDeletedRecord,
} from "@/lib/storage/internalDatabase";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const restored = await restoreDeletedRecord(id);

  if (!restored) {
    return NextResponse.json({ error: "Record not found in trash" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const purged = await purgeDeletedRecord(id);

  if (!purged) {
    return NextResponse.json({ error: "Record not found in trash" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
