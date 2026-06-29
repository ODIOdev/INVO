"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import AdminClientOnboardModal from "@/components/admin/AdminClientOnboardModal";
import AdminClientsPanel from "@/components/admin/AdminClientsPanel";
import AdminDashboardPanel from "@/components/admin/AdminDashboardPanel";
import AdminIntegrationsPanel, {
  type AdminIntegrationsInfo,
} from "@/components/admin/AdminIntegrationsPanel";
import AdminLineItemsPanel from "@/components/admin/AdminLineItemsPanel";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminIcon from "@/components/admin/AdminIcons";
import { isDataBinView, type AdminView } from "@/components/admin/admin-nav";
import type { AdminDashboardStats } from "@/lib/admin-dashboard";
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
} from "@/lib/storage/dbClient";

type AdminDataBinsPanelProps = {
  initialBins: BinSummary[];
  initialRecords: StoredRecord[];
  initialView?: AdminView;
  dashboardStats: AdminDashboardStats;
  integrations: AdminIntegrationsInfo;
};

function adminViewPath(view: AdminView): string {
  if (view === "home") return "/admin";
  return `/admin?view=${view}`;
}

export default function AdminDataBinsPanel({
  initialBins,
  initialRecords,
  initialView = "home",
  dashboardStats,
  integrations,
}: AdminDataBinsPanelProps) {
  const router = useRouter();
  const [bins, setBins] = useState<BinSummary[]>(initialBins);
  const [activeView, setActiveView] = useState<AdminView>(initialView);
  const [records, setRecords] = useState<StoredRecord[]>(initialRecords);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [clientModalOpen, setClientModalOpen] = useState(false);

  const selectedBin = isDataBinView(activeView) ? activeView : null;

  const loadBins = useCallback(async () => {
    const data = await fetchBinSummaries();
    setBins(data.bins);
  }, []);

  const loadRecords = useCallback(async (binId: DataBinId) => {
    const data = await fetchBinRecords(binId);
    setRecords(data.records);
  }, []);

  const refresh = useCallback(async () => {
    if (!selectedBin) return;
    setLoading(true);
    try {
      await loadBins();
      await loadRecords(selectedBin);
    } finally {
      setLoading(false);
    }
  }, [loadBins, loadRecords, selectedBin]);

  const handleDashboardRefresh = useCallback(async () => {
    await loadBins();
    if (selectedBin) {
      await loadRecords(selectedBin);
    }
    router.refresh();
  }, [loadBins, loadRecords, selectedBin, router]);

  const handleSelectBin = async (binId: DataBinId) => {
    setActiveView(binId);
    setExpandedId(null);
    setMessage(null);
    router.replace(adminViewPath(binId));
    setLoading(true);
    try {
      await loadRecords(binId);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectHome = () => {
    setActiveView("home");
    setExpandedId(null);
    setMessage(null);
    router.replace("/admin");
  };

  const handleSelectIntegrations = () => {
    setActiveView("integrations");
    setExpandedId(null);
    setMessage(null);
    router.replace(adminViewPath("integrations"));
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

  const handleClientSaved = useCallback(async () => {
    await loadBins();
    if (selectedBin === "clients") {
      await loadRecords("clients");
    }
    router.refresh();
  }, [loadBins, loadRecords, router, selectedBin]);

  const mainTitle =
    activeView === "home" ? (
      "Dashboard"
    ) : activeView === "integrations" ? (
      "Integrations"
    ) : (
      <span className="inline-flex items-center gap-2">
        <AdminIcon name={DATA_BINS[activeView].icon} size={18} />
        {DATA_BINS[activeView].label}
      </span>
    );

  const mainDescription =
    activeView === "home"
      ? "Metrics, balances, and recent activity"
      : activeView === "integrations"
        ? "Email, payments, and cloud storage"
        : DATA_BINS[activeView].description;

  const showPanelHeader = activeView !== "home";

  return (
    <div className="min-h-screen bg-[#eceef1]">
      <AdminClientOnboardModal
        open={clientModalOpen}
        onClose={() => setClientModalOpen(false)}
        onSaved={handleClientSaved}
      />
      <header className="admin-header">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-400">
              Over Drive OS Dashboard
            </p>
            <h1 className="text-lg font-semibold text-zinc-900">Dashboard</h1>
          </div>
          <nav className="flex flex-wrap items-center gap-2">
            <Link href="/" className="btn-outline text-xs">
              Website
            </Link>
            <Link href="/invoice" className="btn-outline text-xs">
              Invoice App
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-6 py-8 lg:grid-cols-[280px_1fr]">
        <AdminSidebar
          bins={bins}
          activeView={activeView}
          onSelectHome={handleSelectHome}
          onSelectBin={handleSelectBin}
          onSelectIntegrations={handleSelectIntegrations}
        />

        <main className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          {showPanelHeader && (
            <div className="flex items-start justify-between gap-4 border-b border-zinc-100 px-6 py-4">
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-zinc-900">{mainTitle}</h2>
                <p className="text-sm text-zinc-500">{mainDescription}</p>
              </div>
              {activeView === "clients" ? (
                <button
                  type="button"
                  onClick={() => setClientModalOpen(true)}
                  className="btn shrink-0 text-xs"
                >
                  + Add new client
                </button>
              ) : null}
            </div>
          )}

          {message && selectedBin && (
            <div className="mx-6 mt-4 rounded-md bg-blue-50 px-4 py-2 text-sm text-blue-800">
              {message}
            </div>
          )}

          {activeView === "home" ? (
            <AdminDashboardPanel
              stats={dashboardStats}
              onClientSaved={handleDashboardRefresh}
            />
          ) : activeView === "integrations" ? (
            <AdminIntegrationsPanel integrations={integrations} />
          ) : (
            <div
              className={
                selectedBin === "lineItems" || selectedBin === "clients"
                  ? ""
                  : "p-6"
              }
            >
              {selectedBin === "lineItems" ? (
                <AdminLineItemsPanel
                  records={records}
                  loading={loading}
                  onRefresh={refresh}
                />
              ) : selectedBin === "clients" ? (
                <AdminClientsPanel
                  records={records}
                  loading={loading}
                  onRefresh={refresh}
                />
              ) : loading ? (
                <p className="text-sm text-zinc-500">Loading records…</p>
              ) : records.length === 0 ? (
                <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-6 py-12 text-center">
                  <p className="text-sm font-medium text-zinc-700">Bin is empty</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    Save data from the invoice app to add records.
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
          )}
        </main>
      </div>
    </div>
  );
}
