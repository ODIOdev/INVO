"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import AdminDemoForm from "@/components/admin/AdminDemoForm";
import {
  DATA_BINS,
  type BinSummary,
  type DataBinId,
  type StoredRecord,
} from "@/lib/storage/dataBins";
import {
  deleteStoredRecord,
  fetchBinRecords,
  fetchBinSummaries,
  openSubmissionInEditor,
  runAppInitSync,
} from "@/lib/storage/dbClient";

type AdminDataBinsPanelProps = {
  initialBins: BinSummary[];
  initialStats: {
    totalRecords: number;
    lastSyncedAt: string | null;
  };
  initialRecords: StoredRecord[];
  initialBin?: DataBinId;
  storageBackend: "redis" | "local";
};

export default function AdminDataBinsPanel({
  initialBins,
  initialStats,
  initialRecords,
  initialBin = "clients",
  storageBackend,
}: AdminDataBinsPanelProps) {
  const router = useRouter();
  const [bins, setBins] = useState<BinSummary[]>(initialBins);
  const [selectedBin, setSelectedBin] = useState<DataBinId>(initialBin);
  const [records, setRecords] = useState<StoredRecord[]>(initialRecords);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [totalRecords, setTotalRecords] = useState(initialStats.totalRecords);
  const [totalBinRecords, setTotalBinRecords] = useState(
    initialBins.reduce((sum, bin) => sum + bin.count, 0)
  );
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(
    initialStats.lastSyncedAt
  );
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadBins = useCallback(async () => {
    const data = await fetchBinSummaries();
    setBins(data.bins);
    setTotalRecords(data.stats.totalRecords);
    setTotalBinRecords(
      data.bins.reduce((sum: number, bin: BinSummary) => sum + bin.count, 0)
    );
    setLastSyncedAt(data.stats.lastSyncedAt);
  }, []);

  const loadRecords = useCallback(async (binId: DataBinId) => {
    const data = await fetchBinRecords(binId);
    setRecords(data.records);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      await loadBins();
      await loadRecords(selectedBin);
    } finally {
      setLoading(false);
    }
  }, [loadBins, loadRecords, selectedBin]);

  const handleSelectBin = async (binId: DataBinId) => {
    setSelectedBin(binId);
    setExpandedId(null);
    setLoading(true);
    try {
      await loadRecords(binId);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setMessage(null);
    try {
      const result = await runAppInitSync();
      await refresh();
      setMessage(
        result
          ? `Synced ${result.upserted} draft(s) from cloud at ${new Date(result.lastSyncedAt).toLocaleString()}`
          : "Cloud drafts are already up to date"
      );
    } catch {
      setMessage("Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this record from the internal database?")) return;
    await deleteStoredRecord(id);
    await refresh();
  };

  const handleOpen = async (record: StoredRecord) => {
    setOpeningId(record.id);
    setMessage(null);
    try {
      const opened = await openSubmissionInEditor(record);
      if (opened) {
        router.push("/invoice");
      } else {
        setMessage(
          "This record cannot be opened in the editor. Try opening from the Drafts or Documents bin."
        );
      }
    } catch {
      setMessage("Failed to open submission");
    } finally {
      setOpeningId(null);
    }
  };

  const activeBin = DATA_BINS[selectedBin];

  return (
    <div className="min-h-screen bg-[#eceef1]">
      <header className="border-b border-black/[0.06] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-400">
              Over Drive OS Admin
            </p>
            <h1 className="text-lg font-semibold text-zinc-900">
              Internal Database
            </h1>
            <p className="mt-0.5 text-sm text-zinc-500">
              Data bins for clients, documents, drafts, and more
            </p>
          </div>
          <nav className="flex flex-wrap items-center gap-2">
            <Link href="/" className="btn-outline text-xs">
              Home
            </Link>
            <Link href="/invoice" className="btn-outline text-xs">
              Invoice App
            </Link>
            <Link href="/admin/settings" className="btn-outline text-xs">
              Settings
            </Link>
            <button
              type="button"
              onClick={handleSync}
              disabled={syncing}
              className="btn text-xs"
            >
              {syncing ? "Syncing…" : "Sync Drafts"}
            </button>
          </nav>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-6 py-8 lg:grid-cols-[260px_1fr]">
        {/* Bin sidebar */}
        <aside className="space-y-3">
          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              Database
            </p>
            <p className="mt-1 text-2xl font-bold text-zinc-900">{totalRecords}</p>
            <p className="text-xs text-zinc-500">quotes & invoices</p>
            <p className="mt-2 text-xs text-zinc-500">
              {totalBinRecords} total records across all bins
            </p>
            <p className="mt-2 text-[11px] font-medium text-zinc-500">
              {storageBackend === "redis"
                ? "☁️ Vercel Cloud (Redis)"
                : "💾 Local storage"}
            </p>
            {lastSyncedAt && (
              <p className="mt-2 text-[11px] text-zinc-400">
                Last sync: {new Date(lastSyncedAt).toLocaleString()}
              </p>
            )}
          </div>

          <AdminDemoForm selectedBin={selectedBin} onSaved={refresh} />

          <ul className="space-y-1">
            {bins.map((bin) => (
              <li key={bin.binId}>
                <button
                  type="button"
                  onClick={() => handleSelectBin(bin.binId)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition ${
                    selectedBin === bin.binId
                      ? "bg-zinc-900 text-white"
                      : "bg-white text-zinc-700 hover:bg-zinc-50"
                  }`}
                >
                  <span>
                    {bin.icon} {bin.label}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      selectedBin === bin.binId
                        ? "bg-white/20 text-white"
                        : "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    {bin.count}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {/* Records panel */}
        <main className="rounded-lg border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-100 px-6 py-4">
            <h2 className="text-base font-semibold text-zinc-900">
              {activeBin.icon} {activeBin.label}
            </h2>
            <p className="text-sm text-zinc-500">{activeBin.description}</p>
          </div>

          {message && (
            <div className="mx-6 mt-4 rounded-md bg-blue-50 px-4 py-2 text-sm text-blue-800">
              {message}
            </div>
          )}

          <div className="p-6">
            {loading ? (
              <p className="text-sm text-zinc-500">Loading records…</p>
            ) : records.length === 0 ? (
              <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-6 py-12 text-center">
                <p className="text-sm font-medium text-zinc-700">Bin is empty</p>
                <p className="mt-1 text-sm text-zinc-500">
                  Save data from the invoice app or use the demo form to add
                  records.
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {records.map((record) => (
                  <li
                    key={record.id}
                    className="rounded-lg border border-zinc-100 bg-zinc-50/50 transition hover:border-zinc-200 hover:bg-zinc-50"
                  >
                    <div className="flex items-start justify-between gap-4 px-4 py-3">
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left"
                        onClick={() => handleOpen(record)}
                        disabled={openingId === record.id}
                      >
                        <p className="truncate text-sm font-medium text-zinc-900">
                          {record.label}
                        </p>
                        <p className="mt-0.5 text-xs text-zinc-400">
                          {record.source} ·{" "}
                          {new Date(record.updatedAt).toLocaleString()}
                        </p>
                        <p className="mt-1 text-xs font-medium text-blue-600">
                          {openingId === record.id
                            ? "Opening…"
                            : "Click to open in editor →"}
                        </p>
                      </button>
                      <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
                        <button
                          type="button"
                          onClick={() => handleOpen(record)}
                          disabled={openingId === record.id}
                          className="btn px-3 py-1.5 text-xs"
                        >
                          Open
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedId(
                              expandedId === record.id ? null : record.id
                            )
                          }
                          className="btn-outline px-3 py-1.5 text-xs"
                        >
                          Details
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(record.id)}
                          className="btn-ghost text-xs"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    {expandedId === record.id && (
                      <pre className="overflow-x-auto border-t border-zinc-100 bg-white px-4 py-3 text-xs text-zinc-700">
                        {JSON.stringify(record.data, null, 2)}
                      </pre>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
