"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import AdminClientOnboardModal from "@/components/admin/AdminClientOnboardModal";
import AdminClientsPanel from "@/components/admin/AdminClientsPanel";
import AdminDashboardPanel from "@/components/admin/AdminDashboardPanel";
import AdminDocumentDetailModal from "@/components/admin/AdminDocumentDetailModal";
import AdminIntegrationsPanel, {
  type AdminIntegrationsInfo,
} from "@/components/admin/AdminIntegrationsPanel";
import AdminLineItemsPanel from "@/components/admin/AdminLineItemsPanel";
import AdminSystemsApplicationsPanel from "@/components/admin/AdminSystemsApplicationsPanel";
import AdminProfileTag from "@/components/admin/AdminProfileTag";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminIcon from "@/components/admin/AdminIcons";
import {
  adminReturnHref,
  adminReturnLabel,
  adminViewPath,
  isDataBinView,
  isDocumentBin,
  parseAdminReturnFrom,
  type AdminReturnFrom,
  type AdminView,
} from "@/components/admin/admin-nav";
import { activityIconName } from "@/lib/admin-icons";
import type { AdminDashboardStats } from "@/lib/admin-dashboard";
import {
  documentMatchesStatusFilter,
  getDocumentListRowMeta,
  statusTabClass,
  type DocumentStatusFilter,
} from "@/lib/document-list-meta";
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
} from "@/lib/storage/dbClient";

type AdminDataBinsPanelProps = {
  initialBins: BinSummary[];
  initialRecords: StoredRecord[];
  initialView?: AdminView;
  dashboardStats: AdminDashboardStats;
  integrations: AdminIntegrationsInfo;
};

export default function AdminDataBinsPanel({
  initialBins,
  initialRecords,
  initialView = "home",
  dashboardStats,
  integrations,
}: AdminDataBinsPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnFrom = parseAdminReturnFrom(searchParams.get("from"));
  const [bins, setBins] = useState<BinSummary[]>(initialBins);
  const [activeView, setActiveView] = useState<AdminView>(initialView);
  const [records, setRecords] = useState<StoredRecord[]>(initialRecords);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<StoredRecord | null>(
    null
  );
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(
    null
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [documentFilter, setDocumentFilter] =
    useState<DocumentStatusFilter>("all");

  const selectedBin = isDataBinView(activeView) ? activeView : null;

  useEffect(() => {
    setDocumentFilter("all");
  }, [selectedBin]);

  const documentFilterOptions = useMemo((): Array<{
    id: DocumentStatusFilter;
    label: string;
  }> => {
    if (selectedBin === "documents") {
      return [
        { id: "all", label: "All" },
        { id: "open", label: "Open" },
        { id: "closed", label: "Closed" },
        { id: "overdue", label: "Overdue" },
      ];
    }
    if (selectedBin === "quotes") {
      return [
        { id: "all", label: "All" },
        { id: "quote", label: "Quotes" },
      ];
    }
    if (selectedBin === "drafts") {
      return [
        { id: "all", label: "All" },
        { id: "draft", label: "Drafts" },
      ];
    }
    return [];
  }, [selectedBin]);

  const filteredDocumentRecords = useMemo(() => {
    if (!selectedBin || !isDocumentBin(selectedBin)) return records;
    return records.filter((record) =>
      documentMatchesStatusFilter(record, documentFilter)
    );
  }, [documentFilter, records, selectedBin]);

  useEffect(() => {
    setActiveView(initialView);
    if (isDataBinView(initialView)) {
      setRecords(initialRecords);
    }
  }, [initialView, initialRecords]);

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

  const handleSelectBin = async (
    binId: DataBinId,
    from?: AdminReturnFrom | null
  ) => {
    setActiveView(binId);
    setExpandedId(null);
    setSelectedDocument(null);
    setMessage(null);
    router.replace(adminViewPath(binId, from));
    setLoading(true);
    try {
      await loadRecords(binId);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBinFromSidebar = (binId: DataBinId) => {
    void handleSelectBin(binId);
  };

  const handleSelectBinFromDashboard = (binId: DataBinId) => {
    void handleSelectBin(binId, "dashboard");
  };

  const handleSelectHome = () => {
    setActiveView("home");
    setExpandedId(null);
    setSelectedDocument(null);
    setMessage(null);
    router.replace("/admin");
  };

  const handleSelectIntegrations = (from?: AdminReturnFrom | null) => {
    setActiveView("integrations");
    setExpandedId(null);
    setSelectedDocument(null);
    setMessage(null);
    router.replace(adminViewPath("integrations", from));
  };

  const handleSelectIntegrationsFromSidebar = () => {
    handleSelectIntegrations();
  };

  const handleBackNavigation = () => {
    if (returnFrom) {
      router.push(adminReturnHref(returnFrom));
      return;
    }
    handleSelectHome();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this record from the internal database?")) return;
    await deleteStoredRecord(id);
    await refresh();
  };

  const handleDocumentQuickDelete = async (record: StoredRecord) => {
    if (
      !window.confirm(`Delete "${record.label}" from the internal database?`)
    ) {
      return;
    }

    setDeletingDocumentId(record.id);
    setMessage(null);
    try {
      await deleteStoredRecord(record.id);
      if (selectedDocument?.id === record.id) {
        setSelectedDocument(null);
      }
      await refresh();
    } catch {
      setMessage("Failed to delete record.");
    } finally {
      setDeletingDocumentId(null);
    }
  };

  const handleDocumentDeleted = useCallback(async () => {
    await refresh();
    router.refresh();
  }, [refresh, router]);

  const handleDocumentUpdated = useCallback(async () => {
    if (!selectedBin || !selectedDocument) {
      await refresh();
      router.refresh();
      return;
    }

    setLoading(true);
    try {
      await loadBins();
      const data = await fetchBinRecords(selectedBin);
      setRecords(data.records);
      const fresh = data.records.find(
        (entry: StoredRecord) => entry.id === selectedDocument.id
      );
      if (fresh) setSelectedDocument(fresh);
    } finally {
      setLoading(false);
    }
    router.refresh();
  }, [
    loadBins,
    refresh,
    router,
    selectedBin,
    selectedDocument,
  ]);

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
      <AdminDocumentDetailModal
        record={selectedDocument}
        onClose={() => setSelectedDocument(null)}
        onDeleted={handleDocumentDeleted}
        onUpdated={handleDocumentUpdated}
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
            <AdminProfileTag />
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
          onSelectBin={handleSelectBinFromSidebar}
          onSelectIntegrations={handleSelectIntegrationsFromSidebar}
        />

        <main className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          {showPanelHeader && (
            <div className="flex items-start justify-between gap-4 border-b border-zinc-100 px-6 py-4">
              <div className="min-w-0">
                {returnFrom ? (
                  <button
                    type="button"
                    onClick={handleBackNavigation}
                    className="admin-back-button mb-2"
                  >
                    <AdminIcon name="chevron-left" size={14} />
                    Back to {adminReturnLabel(returnFrom)}
                  </button>
                ) : null}
                <h2 className="text-base font-semibold text-zinc-900">{mainTitle}</h2>
                <p className="text-sm text-zinc-500">{mainDescription}</p>
                {selectedBin && isDocumentBin(selectedBin) ? (
                  <div
                    className="admin-doc-filter-bar"
                    role="group"
                    aria-label="Filter documents by status"
                  >
                    {documentFilterOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        className={
                          documentFilter === option.id
                            ? "admin-doc-filter-pill admin-doc-filter-pill-active"
                            : "admin-doc-filter-pill"
                        }
                        aria-pressed={documentFilter === option.id}
                        onClick={() => setDocumentFilter(option.id)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                ) : null}
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
              onSelectBin={handleSelectBinFromDashboard}
            />
          ) : activeView === "integrations" ? (
            <AdminIntegrationsPanel integrations={integrations} />
          ) : (
            <div
              className={
                selectedBin === "lineItems" || selectedBin === "labor" || selectedBin === "clients"
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
              ) : selectedBin === "labor" ? (
                <AdminSystemsApplicationsPanel
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
              ) : selectedBin && isDocumentBin(selectedBin) ? (
                filteredDocumentRecords.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-6 py-12 text-center">
                    <p className="text-sm font-medium text-zinc-700">
                      No matching records
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">
                      Try a different status filter.
                    </p>
                  </div>
                ) : (
                <ul className="space-y-2">
                  {filteredDocumentRecords.map((record) => {
                    const rowMeta = getDocumentListRowMeta(record);
                    const iconName = activityIconName(
                      record.binId === "quotes"
                        ? "Quote"
                        : record.binId === "drafts"
                          ? "Draft"
                          : "Invoice"
                    );

                    return (
                      <li
                        key={record.id}
                        className="admin-client-row group flex items-center gap-1"
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedDocument(record)}
                          className="flex min-w-0 flex-1 items-center gap-3 text-left sm:gap-4"
                        >
                          <span className="admin-dash-action-icon shrink-0">
                            <AdminIcon name={iconName} size={18} />
                          </span>
                          <span className="admin-client-info">
                            <span className="admin-client-name">
                              {record.label}
                            </span>
                            <span className="admin-client-meta">
                              {rowMeta.metaLine}
                            </span>
                          </span>
                          <span className={statusTabClass(rowMeta.status)}>
                            {rowMeta.status}
                          </span>
                          <AdminIcon
                            name="chevron-right"
                            size={16}
                            className="admin-client-chevron"
                          />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDocumentQuickDelete(record)}
                          disabled={deletingDocumentId === record.id}
                          className="mr-2 shrink-0 rounded-lg p-2 text-zinc-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                          aria-label={`Delete ${record.label}`}
                          title="Delete"
                        >
                          <AdminIcon name="trash" size={16} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
                )
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
                          onClick={() =>
                            setExpandedId(
                              expandedId === record.id ? null : record.id
                            )
                          }
                        >
                          <p className="truncate text-sm font-medium text-zinc-900">
                            {record.label}
                          </p>
                          <p className="mt-0.5 text-xs text-zinc-400">
                            {record.source} ·{" "}
                            {new Date(record.updatedAt).toLocaleString()}
                          </p>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(record.id)}
                          className="btn-ghost text-xs"
                        >
                          Delete
                        </button>
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
