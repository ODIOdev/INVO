"use client";

import { formatMoney } from "@/lib/drafts";
import type { CatalogLineItem } from "@/lib/catalog-line-items";

type CatalogLineItemPickerProps = {
  items: CatalogLineItem[];
  onSelect: (item: CatalogLineItem) => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "table" | "default";
};

export default function CatalogLineItemPicker({
  items,
  onSelect,
  disabled = false,
  loading = false,
  variant = "default",
}: CatalogLineItemPickerProps) {
  const empty = items.length === 0;
  const isDisabled = disabled || loading || empty;

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const id = event.target.value;
    if (!id) return;

    const item = items.find((entry) => entry.id === id);
    if (item) onSelect(item);
    event.target.value = "";
  };

  return (
    <div
      className="catalog-picker-wrap no-print"
      title={
        loading
          ? "Loading catalog…"
          : empty
            ? "No catalog items in dashboard"
            : "Pick from catalog"
      }
    >
      <select
        className={
          variant === "table"
            ? "catalog-picker-square catalog-picker-table"
            : "catalog-picker-square"
        }
        onChange={handleChange}
        disabled={isDisabled}
        defaultValue=""
        aria-label="Pick line item from catalog"
      >
        <option value="" disabled hidden />
        {items.map((item) => (
          <option key={item.id} value={item.id}>
            {item.service} — {formatMoney(item.unitPrice)}
          </option>
        ))}
      </select>
    </div>
  );
}
