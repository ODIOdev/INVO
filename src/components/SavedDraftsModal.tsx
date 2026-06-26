"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  calculateGrandTotal,
  deleteDraft,
  formatMoney,
  formatSavedDate,
  listDrafts,
  saveDraftToLibrary,
  type SavedDraft,
} from "@/lib/drafts";
import { deleteDraftEverywhere, loadAllDrafts } from "@/lib/storage/dbClient";

type SavedDraftsModalProps = {
  open: boolean;
  drafts: SavedDraft[];
  loading: boolean;
  onClose: () => void;
  onRefresh: () => Promise<void>;
};

export function SavedDraftsModal({
  open,
  drafts,
  loading,
  onClose,
  onRefresh,
}: SavedDraftsModalProps) {
  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this saved draft?")) return;
    try {
      await deleteDraftEverywhere(id);
    } catch {
      deleteDraft(id);
    }
    await onRefresh();
  };

  const handleOpen = (draft: SavedDraft) => {
    saveDraftToLibrary(draft.state, draft.id);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="drafts-dialog-title"
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
          <div>
            <h2
              id="drafts-dialog-title"
              className="text-base font-semibold text-zinc-900"
            >
              Saved Drafts
            </h2>
            <p className="mt-0.5 text-sm text-zinc-500">
              Quotes and invoices saved to the cloud — accessible from any device
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <p className="py-12 text-center text-sm text-zinc-500">
              Loading drafts from cloud…
            </p>
          ) : drafts.length === 0 ? (
            <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-6 py-12 text-center">
              <p className="text-sm font-medium text-zinc-700">No saved drafts</p>
              <p className="mt-1 text-sm text-zinc-500">
                Save a quote or invoice from the app to see it here.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {drafts.map((draft) => {
                const { state } = draft;
                const title =
                  state.client.projectName ||
                  state.client.clientName ||
                  state.client.companyName ||
                  "Untitled";
                const subtitle =
                  state.client.clientName || state.client.companyName || "—";

                return (
                  <li
                    key={draft.id}
                    className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                          {state.docType}
                        </span>
                        <span className="text-xs font-medium text-zinc-400">
                          {state.client.documentNumber}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-sm font-semibold text-zinc-900">
                        {title}
                      </p>
                      <p className="truncate text-sm text-zinc-500">{subtitle}</p>
                      <p className="mt-1 text-xs text-zinc-400">
                        Saved {formatSavedDate(draft.savedAt)}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end lg:flex-row lg:items-center">
                      <span className="text-sm font-semibold tabular-nums text-zinc-900">
                        {formatMoney(calculateGrandTotal(state))}
                      </span>
                      <div className="flex gap-2">
                        <Link
                          href={`/invoice?draft=${draft.id}`}
                          className="btn px-3 py-1.5 text-xs"
                          onClick={() => {
                            handleOpen(draft);
                            onClose();
                          }}
                        >
                          Open
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(draft.id)}
                          className="btn-outline px-3 py-1.5 text-xs text-red-600 hover:border-red-200 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-zinc-100 px-6 py-4">
          <button type="button" onClick={onClose} className="btn-outline w-full sm:w-auto">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export function SavedDraftsButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [drafts, setDrafts] = useState<SavedDraft[]>([]);
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(listDrafts().length);
  }, []);

  const refreshDrafts = async () => {
    setLoading(true);
    try {
      const latest = await loadAllDrafts();
      setDrafts(latest);
      setCount(latest.length);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = async () => {
    setOpen(true);
    await refreshDrafts();
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className={className ?? "btn-outline"}
      >
        Saved Drafts{count > 0 ? ` (${count})` : ""}
      </button>
      <SavedDraftsModal
        open={open}
        drafts={drafts}
        loading={loading}
        onClose={() => setOpen(false)}
        onRefresh={refreshDrafts}
      />
    </>
  );
}
