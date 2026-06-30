"use client";

import { formatMoney } from "@/lib/drafts";
import type { CatalogSystem } from "@/lib/catalog-systems";

type CatalogSystemPickerProps = {
  items: CatalogSystem[];
  onSelect: (item: CatalogSystem) => void;
  disabled?: boolean;
  loading?: boolean;
};

export default function CatalogSystemPicker({
  items,
  onSelect,
  disabled = false,
  loading = false,
}: CatalogSystemPickerProps) {
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
            ? "No systems in dashboard catalog"
            : "Pick from catalog"
      }
    >
      <select
        className="catalog-picker-square"
        onChange={handleChange}
        disabled={isDisabled}
        defaultValue=""
        aria-label="Pick system or application from catalog"
      >
        <option value="" disabled hidden />
        {items.map((item) => (
          <option key={item.id} value={item.id}>
            {item.title} — {formatMoney(item.rate)}/hr
          </option>
        ))}
      </select>
    </div>
  );
}
