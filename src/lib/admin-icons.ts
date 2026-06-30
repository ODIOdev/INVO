export type AdminIconName =
  | "clients"
  | "documents"
  | "quotes"
  | "drafts"
  | "lineItems"
  | "labor"
  | "notes"
  | "home"
  | "integrations"
  | "settings"
  | "folder-open"
  | "check-circle"
  | "clock"
  | "user-plus"
  | "pencil"
  | "trash"
  | "chevron-down"
  | "chevron-left"
  | "chevron-right"
  | "cloud"
  | "mail"
  | "credit-card"
  | "eye"
  | "eye-off";

export type DataBinIconName = Extract<
  AdminIconName,
  "clients" | "documents" | "quotes" | "drafts" | "lineItems" | "labor" | "notes"
>;

export function binIconName(binId: DataBinIconName): AdminIconName {
  return binId;
}

export function activityIconName(
  type: "Invoice" | "Quote" | "Client" | "Draft"
): AdminIconName {
  switch (type) {
    case "Invoice":
      return "documents";
    case "Quote":
      return "quotes";
    case "Client":
      return "clients";
    default:
      return "drafts";
  }
}
