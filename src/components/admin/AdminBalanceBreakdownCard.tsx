"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/drafts";
import AdminIcon from "@/components/admin/AdminIcons";

type AdminBalanceBreakdownCardProps = {
  title?: string;
  subtitle?: string;
  open: number;
  closed: number;
  overdue: number;
  centerLabel?: string;
  amounts?: {
    open: number;
    closed: number;
    overdue: number;
  };
  footerLabel?: string;
  footerAmount?: number;
  compact?: boolean;
  surface?: "card" | "plain";
  className?: string;
};

type DonutSegmentKey = "open" | "closed" | "overdue";

type DonutSegment = {
  key: DonutSegmentKey;
  label: string;
  value: number;
  color: string;
  amount?: number;
};

function BalanceBreakdownDonut({
  open,
  closed,
  overdue,
  centerLabel = "Invoices",
  amounts,
  compact = false,
}: {
  open: number;
  closed: number;
  overdue: number;
  centerLabel?: string;
  amounts?: AdminBalanceBreakdownCardProps["amounts"];
  compact?: boolean;
}) {
  const [hoveredKey, setHoveredKey] = useState<DonutSegmentKey | null>(null);
  const openNotOverdue = Math.max(open - overdue, 0);
  const total = open + closed;

  const segments = (
    [
      {
        key: "closed" as const,
        label: "Closed",
        value: closed,
        color: "#10b981",
        amount: amounts?.closed,
      },
      {
        key: "open" as const,
        label: "Open",
        value: openNotOverdue,
        color: "#fbbf24",
        amount: amounts?.open,
      },
      {
        key: "overdue" as const,
        label: "Overdue",
        value: overdue,
        color: "#f43f5e",
        amount: amounts?.overdue,
      },
    ] satisfies DonutSegment[]
  ).filter((segment) => segment.value > 0);

  const hoveredSegment =
    hoveredKey !== null
      ? (segments.find((segment) => segment.key === hoveredKey) ?? null)
      : null;

  const size = compact ? 140 : 168;
  const strokeWidth = compact ? 18 : 22;
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
          const dimmed =
            hoveredKey !== null && hoveredKey !== segment.key;

          return (
            <circle
              key={segment.key}
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${length} ${circumference}`}
              strokeLinecap="butt"
              transform={`rotate(${rotation} ${cx} ${cy})`}
              className="balance-breakdown-arc"
              style={{
                opacity: dimmed ? 0.35 : 1,
                cursor: "pointer",
              }}
              pointerEvents="stroke"
              onMouseEnter={() => setHoveredKey(segment.key)}
              onMouseLeave={() => setHoveredKey(null)}
              aria-label={`${segment.label}: ${segment.value} invoice${segment.value === 1 ? "" : "s"}${
                segment.amount !== undefined
                  ? `, ${formatMoney(segment.amount)}`
                  : ""
              }`}
            />
          );
        })
      : null;

  const legend = [
    {
      key: "open" as const,
      label: "Open",
      value: open,
      color: "#fbbf24",
      amount: amounts?.open,
      rowClass: "balance-legend-row-open",
    },
    {
      key: "closed" as const,
      label: "Closed",
      value: closed,
      color: "#10b981",
      amount: amounts?.closed,
      rowClass: "balance-legend-row-closed",
    },
    {
      key: "overdue" as const,
      label: "Overdue",
      value: overdue,
      color: "#f43f5e",
      amount: amounts?.overdue,
      rowClass: "balance-legend-row-overdue",
    },
  ] as const;

  const hoveredPct =
    hoveredSegment && total > 0
      ? Math.round((hoveredSegment.value / total) * 100)
      : 0;

  return (
    <div
      className={`balance-breakdown-donut ${
        compact ? "balance-breakdown-donut-mt-compact" : "balance-breakdown-donut-mt"
      }`}
    >
      <div
        className="balance-breakdown-chart relative shrink-0"
        style={{ width: size, height: size }}
        role="img"
        aria-label={`Balance breakdown: ${open} open, ${closed} closed, ${overdue} overdue`}
        onMouseLeave={() => setHoveredKey(null)}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="#e4e4e7"
            strokeWidth={strokeWidth}
          />
          {arcs}
        </svg>
        <div
          className={`balance-breakdown-center ${
            hoveredSegment ? "balance-breakdown-center-active" : ""
          }`}
          aria-live="polite"
        >
          {hoveredSegment ? (
            <>
              <span
                className="balance-breakdown-center-dot"
                style={{ backgroundColor: hoveredSegment.color }}
              />
              <span className="balance-breakdown-center-title">
                {hoveredSegment.label}
              </span>
              <span
                className={`balance-breakdown-center-count ${
                  compact ? "text-lg" : "text-xl"
                }`}
              >
                {hoveredSegment.value}
              </span>
              {hoveredSegment.amount !== undefined ? (
                <span className="balance-breakdown-center-amount">
                  {formatMoney(hoveredSegment.amount)}
                </span>
              ) : null}
              <span className="balance-breakdown-center-label">{hoveredPct}%</span>
            </>
          ) : (
            <>
              <span
                className={`balance-breakdown-center-count ${
                  compact ? "text-xl" : "text-2xl"
                }`}
              >
                {total}
              </span>
              <span className="balance-breakdown-center-label">
                {total === 1 ? centerLabel.replace(/s$/, "") : centerLabel}
              </span>
            </>
          )}
        </div>
      </div>

      <ul className="balance-breakdown-legend">
        {legend.map((item) => {
          const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
          const isZero = item.value === 0 && (item.amount ?? 0) <= 0;
          const isHovered = hoveredKey === item.key;

          return (
            <li
              key={item.key}
              className={`balance-legend-row ${
                isZero ? "balance-legend-row-zero" : item.rowClass
              } ${isHovered ? "balance-legend-row-hovered" : ""}`}
              onMouseEnter={() => setHoveredKey(item.key)}
              onMouseLeave={() => setHoveredKey(null)}
            >
              <span className="balance-legend-head">
                <span
                  className="balance-legend-dot"
                  style={{ backgroundColor: item.color }}
                />
                <span className="balance-legend-label">{item.label}</span>
              </span>
              <span className="balance-legend-meta">
                <span className="balance-legend-count">{item.value}</span>
                {total > 0 ? (
                  <span className="balance-legend-pct">{pct}%</span>
                ) : null}
                {item.amount !== undefined ? (
                  <span
                    className={`balance-legend-amount ${
                      item.amount > 0
                        ? "balance-legend-amount-active"
                        : "balance-legend-amount-zero"
                    }`}
                  >
                    {formatMoney(item.amount)}
                  </span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function AdminBalanceBreakdownCard({
  title = "Invoice breakdown",
  subtitle,
  open,
  closed,
  overdue,
  centerLabel = "Invoices",
  amounts,
  footerLabel,
  footerAmount,
  compact = false,
  surface = "card",
  className = "",
}: AdminBalanceBreakdownCardProps) {
  const total = open + closed;
  const resolvedSubtitle =
    subtitle ??
    `Open vs closed across ${total || "no"} tracked invoice${total === 1 ? "" : "s"}`;

  const showFooter =
    footerLabel !== undefined && footerAmount !== undefined;

  const isCard = surface === "card";

  return (
    <article
      className={
        isCard
          ? `admin-balance-card ${className}`.trim()
          : className
      }
    >
      {isCard ? (
        <>
          <span
            className="admin-balance-card-glow admin-balance-card-glow-amber"
            aria-hidden
          />
          <span
            className="admin-balance-card-glow admin-balance-card-glow-emerald"
            aria-hidden
          />
        </>
      ) : null}
      <div className={isCard ? "admin-balance-card-body" : undefined}>
        <header className="admin-balance-card-header">
          <div className="admin-balance-card-title-row">
            {isCard ? (
              <span className="admin-balance-card-icon" aria-hidden>
                <AdminIcon name="documents" size={16} />
              </span>
            ) : null}
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
              <p className="mt-0.5 text-xs text-zinc-500">{resolvedSubtitle}</p>
            </div>
          </div>
        </header>
        <BalanceBreakdownDonut
          open={open}
          closed={closed}
          overdue={overdue}
          centerLabel={centerLabel}
          amounts={amounts}
          compact={compact}
        />
        {showFooter ? (
          <div className="admin-balance-card-footer">
            <span className="text-xs font-medium text-zinc-600">{footerLabel}</span>
            <span className="admin-balance-card-footer-amount">
              {formatMoney(footerAmount)}
            </span>
          </div>
        ) : null}
      </div>
    </article>
  );
}
