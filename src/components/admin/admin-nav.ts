import type { DataBinId } from "@/lib/storage/dataBins";
import { isDataBinId } from "@/lib/storage/dataBins";

export type AdminView = DataBinId | "integrations" | "home";

export type AdminNavGroup = {
  title: string;
  items: DataBinId[];
};

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    title: "People",
    items: ["clients"],
  },
  {
    title: "Documents",
    items: ["documents", "quotes", "drafts"],
  },
  {
    title: "Catalog",
    items: ["lineItems", "labor"],
  },
];

export function isDataBinView(view: AdminView): view is DataBinId {
  return view !== "integrations" && view !== "home";
}

export type DocumentBinId = Extract<DataBinId, "documents" | "quotes" | "drafts">;

export function isDocumentBin(binId: DataBinId): binId is DocumentBinId {
  return binId === "documents" || binId === "quotes" || binId === "drafts";
}

export function parseAdminView(value: string | undefined): AdminView {
  if (!value) return "home";
  if (value === "home" || value === "integrations") return value;
  if (isDataBinId(value)) return value;
  return "home";
}

export type AdminReturnFrom = "dashboard" | "settings";

export function parseAdminReturnFrom(
  value: string | null | undefined
): AdminReturnFrom | null {
  if (value === "dashboard" || value === "settings") return value;
  return null;
}

export function adminViewPath(
  view: AdminView,
  from?: AdminReturnFrom | null
): string {
  if (view === "home") return "/admin";
  const params = new URLSearchParams({ view });
  if (from) params.set("from", from);
  return `/admin?${params.toString()}`;
}

export function adminReturnHref(from: AdminReturnFrom): string {
  return from === "settings" ? "/admin/settings" : "/admin";
}

export function adminReturnLabel(from: AdminReturnFrom): string {
  return from === "settings" ? "Settings" : "Dashboard";
}
