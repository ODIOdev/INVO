import { NextResponse } from "next/server";
import type { DraftState, SavedDraft } from "@/lib/drafts";
import { requireStorageScope } from "@/lib/storage/storage-auth";
import { getRecordsByBin } from "@/lib/storage/internalDatabase";

export async function GET() {
  const scopeResult = await requireStorageScope();
  if (scopeResult instanceof NextResponse) return scopeResult;

  const records = await getRecordsByBin(scopeResult, "drafts");

  const drafts: SavedDraft[] = records
    .map((record) => {
      const draftId = (record.data.draftId as string) || record.id.replace(/^draft-/, "");
      const state = record.data.state as DraftState | undefined;
      if (!state) return null;

      return {
        id: draftId,
        savedAt: record.updatedAt,
        state,
      } satisfies SavedDraft;
    })
    .filter((draft): draft is SavedDraft => draft !== null)
    .sort(
      (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
    );

  return NextResponse.json({ drafts });
}
