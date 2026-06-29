"use client";

import Link from "next/link";
import { useState } from "react";
import AdminClientOnboardModal from "@/components/admin/AdminClientOnboardModal";
import { formatMoney } from "@/lib/drafts";
import type { AdminDashboardStats } from "@/lib/admin-dashboard";
import { activityIconName, type AdminIconName } from "@/lib/admin-icons";
import AdminIcon from "@/components/admin/AdminIcons";

type AdminDashboardPanelProps = {
  stats: AdminDashboardStats;
  onClientSaved?: () => void | Promise<void>;
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

function InvoiceBreakdownDonut({
  open,
  closed,
  overdue,
}: {
  open: number;
  closed: number;
  overdue: number;
}) {
  const openNotOverdue = Math.max(open - overdue, 0);
  const total = open + closed;

  const segments = [
    { label: "Closed", value: closed, color: "#10b981" },
    { label: "Open", value: openNotOverdue, color: "#fbbf24" },
    { label: "Overdue", value: overdue, color: "#f43f5e" },
  ].filter((segment) => segment.value > 0);

  const size = 168;
  const strokeWidth = 22;
  const radius = (size - strokeWidth) / 2 - 4;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulative = 0;
  const arcs =
    total > 0
      ? segments.map((segment) => {
          const length = (segment.value / total) * circumference;
          const rotation = (cumulative / total) * 360 - 90;
          cumulative += segment.value;

          return (
            <circle
              key={segment.label}
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${length} ${circumference}`}
              transform={`rotate(${rotation} ${cx} ${cy})`}
            />
          );
        })
      : null;

  const legend = [
    { label: "Open", value: open, color: "#fbbf24" },
    { label: "Closed", value: closed, color: "#10b981" },
    { label: "Overdue", value: overdue, color: "#f43f5e" },
  ];

  return (
    <div className="mt-12 flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-center">
      <div
        className="relative shrink-0"
        style={{ width: size, height: size }}
        role="img"
        aria-label={`Invoice breakdown: ${open} open, ${closed} closed, ${overdue} overdue`}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="#f4f4f5"
            strokeWidth={strokeWidth}
          />
          {arcs}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold tabular-nums text-zinc-900">{total}</span>
          <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
            {total === 1 ? "Invoice" : "Invoices"}
          </span>
        </div>
      </div>

      <ul className="grid w-full min-w-[148px] gap-3 sm:w-auto">
        {legend.map((item) => {
          const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;

          return (
            <li key={item.label} className="flex items-center justify-between gap-4 text-xs">
              <span className="flex items-center gap-2 font-medium text-zinc-600">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                {item.label}
              </span>
              <span className="flex items-baseline gap-1.5 tabular-nums">
                <span className="font-semibold text-zinc-900">{item.value}</span>
                {total > 0 ? (
                  <span className="text-zinc-400">{pct}%</span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
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

export default function AdminDashboardPanel({
  stats,
  onClientSaved,
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
          href="/admin?view=documents"
          barValue={stats.openInvoices}
          barMax={invoiceTotal}
        />
        <MetricCard
          accent="emerald"
          icon="check-circle"
          label="Closed"
          value={String(stats.closedInvoices)}
          detail={`${formatMoney(stats.collectedDeposits)} deposits`}
          href="/admin?view=documents"
          barValue={stats.closedInvoices}
          barMax={invoiceTotal}
        />
        <MetricCard
          accent="rose"
          icon="clock"
          label="Overdue"
          value={String(stats.overdueInvoices)}
          detail="Past due w/ balance"
          href="/admin?view=documents"
          barValue={stats.overdueInvoices}
          barMax={Math.max(stats.openInvoices, 1)}
        />
        <MetricCard
          accent="blue"
          icon="quotes"
          label="Quotes"
          value={String(stats.totalQuotes)}
          detail={formatMoney(stats.quotePipeline)}
          href="/admin?view=quotes"
          barValue={stats.totalQuotes}
          barMax={Math.max(stats.totalQuotes, stats.totalInvoices, 1)}
        />
        <MetricCard
          accent="violet"
          icon="user-plus"
          label="New clients"
          value={String(stats.newClients)}
          detail={`${stats.totalClients} total`}
          href="/admin?view=clients"
          barValue={stats.newClients}
          barMax={Math.max(stats.totalClients, 1)}
        />
        <MetricCard
          accent="zinc"
          icon="drafts"
          label="Drafts"
          value={String(stats.activeDrafts)}
          detail={`${stats.totalInvoices} invoices`}
          href="/admin?view=drafts"
          barValue={stats.activeDrafts}
          barMax={Math.max(stats.activeDrafts, 1)}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-zinc-900">Invoice breakdown</h3>
          <p className="mt-1 text-xs text-zinc-500">
            Open vs closed across {invoiceTotal || "no"} tracked invoices
          </p>
          <InvoiceBreakdownDonut
            open={stats.openInvoices}
            closed={stats.closedInvoices}
            overdue={stats.overdueInvoices}
          />
        </article>

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
              href="/admin?view=quotes"
              icon="quotes"
              label="Browse quotes"
            />
            <QuickAction
              href="/admin?view=clients"
              icon="clients"
              label="View clients"
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
          <ul className="divide-y divide-zinc-100">
            {stats.recentActivity.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-4 px-5 py-3.5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="admin-dash-action-icon">
                    <AdminIcon
                      name={activityIconName(item.type)}
                      size={16}
                    />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-900">
                      {item.label}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-400">
                      {item.type} · {formatActivityDate(item.date)}
                    </p>
                  </div>
                </div>
                {item.amount !== null && (
                  <p className="shrink-0 text-sm font-semibold tabular-nums text-zinc-800">
                    {formatMoney(item.amount)}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
