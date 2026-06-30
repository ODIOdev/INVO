"use client";

import Link from "next/link";
import { useState } from "react";
import AdminBalanceBreakdownCard from "@/components/admin/AdminBalanceBreakdownCard";
import AdminClientOnboardModal from "@/components/admin/AdminClientOnboardModal";
import { formatMoney } from "@/lib/drafts";
import type { AdminDashboardActivity, AdminDashboardStats } from "@/lib/admin-dashboard";
import { activityIconName, type AdminIconName } from "@/lib/admin-icons";
import type { DataBinId } from "@/lib/storage/dataBins";
import AdminIcon from "@/components/admin/AdminIcons";

type AdminDashboardPanelProps = {
  stats: AdminDashboardStats;
  onClientSaved?: () => void | Promise<void>;
  onSelectBin: (binId: DataBinId) => void;
};

function MetricCard({
  label,
  value,
  detail,
  accent,
  icon,
  href,
  barValue = 0,
  barMax = 0,
}: {
  label: string;
  value: string;
  detail?: string;
  accent: "blue" | "emerald" | "amber" | "rose" | "violet" | "zinc";
  icon: AdminIconName;
  href: string;
  barValue?: number;
  barMax?: number;
}) {
  const pct =
    barMax > 0 ? Math.min(100, Math.round((barValue / barMax) * 100)) : 0;

  return (
    <Link href={href} className="admin-metric-link group">
      <article className={`admin-metric-card admin-metric-card-${accent}`}>
        <span
          className={`admin-metric-glow admin-metric-glow-${accent}`}
          aria-hidden
        />
        <div className="admin-metric-body">
          <div className="admin-metric-head">
            <p className="admin-metric-label">{label}</p>
            <span className={`admin-metric-icon admin-metric-icon-${accent}`}>
              <AdminIcon name={icon} size={14} />
            </span>
          </div>
          <p className="admin-metric-value">{value}</p>
          {detail ? <p className="admin-metric-detail">{detail}</p> : null}
        </div>
        <div className="admin-metric-bar-track" aria-hidden>
          <div
            className={`admin-metric-bar-fill admin-metric-bar-${accent}`}
            style={{ width: `${Math.max(pct, barValue > 0 ? 4 : 0)}%` }}
          />
        </div>
      </article>
    </Link>
  );
}

function QuickAction({
  icon,
  label,
  href,
  onClick,
}: {
  icon: AdminIconName;
  label: string;
  href?: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span className="admin-dash-action-icon">
        <AdminIcon name={icon} size={16} />
      </span>
      <span className="flex-1 text-left">{label}</span>
      <AdminIcon name="chevron-right" size={14} className="text-zinc-300" />
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="admin-dash-action">
        {content}
      </button>
    );
  }

  return (
    <Link href={href ?? "#"} className="admin-dash-action">
      {content}
    </Link>
  );
}

function formatActivityDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function activityStatusTextClass(
  status: NonNullable<AdminDashboardActivity["status"]>
): string {
  switch (status) {
    case "Open":
      return "text-amber-700";
    case "Closed":
      return "text-emerald-700";
    case "Overdue":
      return "text-rose-700";
    case "Quote":
      return "text-blue-700";
    case "Draft":
      return "text-zinc-500";
    default:
      return "text-zinc-600";
  }
}

const ACTIVITY_SHEET_GRID =
  "admin-sheet-grid grid grid-cols-[3.25rem_minmax(8rem,1fr)_minmax(10rem,1.4fr)_5.5rem_6.75rem_7.25rem] items-center";

export default function AdminDashboardPanel({
  stats,
  onClientSaved,
  onSelectBin,
}: AdminDashboardPanelProps) {
  const invoiceTotal = stats.openInvoices + stats.closedInvoices;
  const [clientModalOpen, setClientModalOpen] = useState(false);

  return (
    <div className="space-y-6 p-6">
      <AdminClientOnboardModal
        open={clientModalOpen}
        onClose={() => setClientModalOpen(false)}
        onSaved={onClientSaved ?? (() => undefined)}
      />
      <section className="admin-dash-hero">
        <div className="relative z-[1] flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between lg:gap-6">
          <div className="min-w-0 lg:max-w-[46%]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-100/80">
              Overview
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-white">
              Business at a glance
            </h2>
            <p className="mt-2 text-sm text-blue-100/80">
              Live snapshot from your quotes, invoices, clients, and outstanding
              balances.
            </p>
          </div>
          <div className="admin-dash-hero-stats">
            <div className="admin-dash-hero-stat">
              <p className="admin-dash-hero-stat-label">Outstanding</p>
              <p className="admin-dash-hero-stat-value">
                {formatMoney(stats.outstandingBalance)}
              </p>
            </div>
            <div className="admin-dash-hero-stat">
              <p className="admin-dash-hero-stat-label">Quote pipeline</p>
              <p className="admin-dash-hero-stat-value">
                {formatMoney(stats.quotePipeline)}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="admin-metric-grid">
        <MetricCard
          accent="amber"
          icon="folder-open"
          label="Open"
          value={String(stats.openInvoices)}
          detail={`${formatMoney(stats.outstandingBalance)} due`}
          href="/admin?view=documents&from=dashboard"
          barValue={stats.openInvoices}
          barMax={invoiceTotal}
        />
        <MetricCard
          accent="emerald"
          icon="check-circle"
          label="Closed"
          value={String(stats.closedInvoices)}
          detail={formatMoney(stats.closedBalance)}
          href="/admin?view=documents&from=dashboard"
          barValue={stats.closedInvoices}
          barMax={invoiceTotal}
        />
        <MetricCard
          accent="rose"
          icon="clock"
          label="Overdue"
          value={String(stats.overdueInvoices)}
          detail="Past due w/ balance"
          href="/admin?view=documents&from=dashboard"
          barValue={stats.overdueInvoices}
          barMax={Math.max(stats.openInvoices, 1)}
        />
        <MetricCard
          accent="blue"
          icon="quotes"
          label="Quotes"
          value={String(stats.totalQuotes)}
          detail={formatMoney(stats.quotePipeline)}
          href="/admin?view=quotes&from=dashboard"
          barValue={stats.totalQuotes}
          barMax={Math.max(stats.totalQuotes, stats.totalInvoices, 1)}
        />
        <MetricCard
          accent="violet"
          icon="user-plus"
          label="New clients"
          value={String(stats.newClients)}
          detail={`${stats.totalClients} total`}
          href="/admin?view=clients&from=dashboard"
          barValue={stats.newClients}
          barMax={Math.max(stats.totalClients, 1)}
        />
        <MetricCard
          accent="zinc"
          icon="drafts"
          label="Drafts"
          value={String(stats.activeDrafts)}
          detail={`${stats.totalInvoices} invoices`}
          href="/admin?view=drafts&from=dashboard"
          barValue={stats.activeDrafts}
          barMax={Math.max(stats.activeDrafts, 1)}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <AdminBalanceBreakdownCard
          title="Dashboard balances"
          subtitle={`Invoice status across ${invoiceTotal || "no"} tracked invoice${invoiceTotal === 1 ? "" : "s"}`}
          open={stats.openInvoices}
          closed={stats.closedInvoices}
          overdue={stats.overdueInvoices}
          amounts={{
            open: stats.openBalance,
            closed: stats.closedBalance,
            overdue: stats.overdueBalance,
          }}
          footerLabel="Total open invoices"
          footerAmount={stats.openBalance}
        />

        <article className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-zinc-900">Quick actions</h3>
          <p className="mt-1 text-xs text-zinc-500">Jump into common workflows</p>
          <div className="mt-4 grid gap-2">
            <QuickAction
              href="/invoice"
              icon="pencil"
              label="New quote or invoice"
            />
            <QuickAction
              icon="user-plus"
              label="Add new client"
              onClick={() => setClientModalOpen(true)}
            />
            <QuickAction
              icon="lineItems"
              label="Add line item"
              onClick={() => onSelectBin("lineItems")}
            />
            <QuickAction
              icon="labor"
              label="Add Systems cost"
              onClick={() => onSelectBin("labor")}
            />
          </div>
        </article>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 px-5 py-4">
          <h3 className="text-sm font-semibold text-zinc-900">Recent activity</h3>
          <p className="mt-0.5 text-xs text-zinc-500">
            Latest updates across clients, quotes, and invoices
          </p>
        </div>
        {stats.recentActivity.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-zinc-500">
            No activity yet — create a quote or invoice to get started.
          </p>
        ) : (
          <div className="admin-sheet">
            <div className={`${ACTIVITY_SHEET_GRID} admin-sheet-head`}>
              <div className="admin-sheet-cell admin-sheet-cell-head" aria-hidden />
              <div className="admin-sheet-cell admin-sheet-cell-head">Record</div>
              <div className="admin-sheet-cell admin-sheet-cell-head">Details</div>
              <div className="admin-sheet-cell admin-sheet-cell-head">Status</div>
              <div className="admin-sheet-cell admin-sheet-cell-head text-right">
                Amount
              </div>
              <div className="admin-sheet-cell admin-sheet-cell-head text-right">
                Updated
              </div>
            </div>
            {stats.recentActivity.map((item) => (
              <div key={item.id} className={`${ACTIVITY_SHEET_GRID} admin-sheet-row`}>
                <div
                  className="admin-sheet-cell flex items-center justify-center"
                  title={item.type}
                >
                  <span className="admin-sheet-type-icon">
                    <AdminIcon name={activityIconName(item.type)} size={14} />
                  </span>
                </div>
                <div className="admin-sheet-cell truncate font-medium text-zinc-900">
                  {item.label}
                </div>
                <div className="admin-sheet-cell truncate text-zinc-600">
                  {item.metaLine}
                </div>
                <div
                  className={`admin-sheet-cell truncate text-xs font-medium uppercase tracking-wide ${
                    item.status
                      ? activityStatusTextClass(item.status)
                      : "text-zinc-400"
                  }`}
                >
                  {item.status ?? "—"}
                </div>
                <div className="admin-sheet-cell text-right tabular-nums">
                  {item.amount !== null ? (
                    <>
                      <span className="font-medium text-zinc-900">
                        {formatMoney(item.amount)}
                      </span>
                      {item.amountLabel ? (
                        <span className="mt-0.5 block text-[10px] font-normal normal-case tracking-normal text-zinc-400">
                          {item.amountLabel}
                        </span>
                      ) : null}
                    </>
                  ) : (
                    <span className="text-zinc-300">—</span>
                  )}
                </div>
                <div className="admin-sheet-cell text-right text-xs tabular-nums text-zinc-500">
                  {formatActivityDate(item.date)}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
