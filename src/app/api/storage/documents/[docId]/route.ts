import { NextResponse } from "next/server";
import { deleteDocumentBundle } from "@/lib/storage/internalDatabase";

type RouteContext = { params: Promise<{ docId: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  const { docId } = await context.params;
  if (!docId) {
    return NextResponse.json({ error: "Document id required" }, { status: 400 });
  }

  const removed = await deleteDocumentBundle(docId);
  return NextResponse.json({ success: true, removed });
}
