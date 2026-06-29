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
    items: ["quotes", "documents", "drafts"],
  },
  {
    title: "Catalog",
    items: ["lineItems", "labor", "notes"],
  },
];

export function isDataBinView(view: AdminView): view is DataBinId {
  return view !== "integrations" && view !== "home";
}

export function parseAdminView(value: string | undefined): AdminView {
  if (!value) return "home";
  if (value === "home" || value === "integrations") return value;
  if (isDataBinId(value)) return value;
  return "home";
}
