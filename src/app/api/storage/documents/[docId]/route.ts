import { NextResponse } from "next/server";
import { requireStorageScope } from "@/lib/storage/storage-auth";
import {
  deleteDocumentBundle,
  getRecordsForDocument,
} from "@/lib/storage/internalDatabase";

type RouteContext = { params: Promise<{ docId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const scopeResult = await requireStorageScope();
  if (scopeResult instanceof NextResponse) return scopeResult;

  const { docId } = await context.params;
  if (!docId) {
    return NextResponse.json({ error: "Document id required" }, { status: 400 });
  }

  const records = await getRecordsForDocument(scopeResult, docId);
  return NextResponse.json({ docId, records });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const scopeResult = await requireStorageScope();
  if (scopeResult instanceof NextResponse) return scopeResult;

  const { docId } = await context.params;
  if (!docId) {
    return NextResponse.json({ error: "Document id required" }, { status: 400 });
  }

  const removed = await deleteDocumentBundle(scopeResult, docId);
  return NextResponse.json({ success: true, removed });
}
