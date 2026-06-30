"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { formatMoney } from "@/lib/drafts";
import type { CatalogLineItem } from "@/lib/catalog-line-items";

type CatalogLineItemPickerProps = {
  items: CatalogLineItem[];
  onSelect: (item: CatalogLineItem) => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "table" | "default";
};

type MenuPosition = {
  top: number;
  left: number;
  minWidth: number;
};

function computeMenuPosition(button: HTMLButtonElement): MenuPosition {
  const rect = button.getBoundingClientRect();
  const minWidth = Math.max(rect.width, 200);
  const maxMenuHeight = 208;
  const gap = 4;
  const spaceBelow = window.innerHeight - rect.bottom;
  const openUp = spaceBelow < maxMenuHeight && rect.top > maxMenuHeight;

  return {
    top: openUp ? rect.top - maxMenuHeight - gap : rect.bottom + gap,
    left: rect.left,
    minWidth,
  };
}

export default function CatalogLineItemPicker({
  items,
  onSelect,
  disabled = false,
  loading = false,
  variant = "default",
}: CatalogLineItemPickerProps) {
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const empty = items.length === 0;
  const isDisabled = disabled || loading || empty;

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) {
      setMenuPosition(null);
      return;
    }

    const updatePosition = () => {
      if (!buttonRef.current) return;
      setMenuPosition(computeMenuPosition(buttonRef.current));
    };

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        !wrapRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const pick = (item: CatalogLineItem) => {
    onSelect(item);
    setOpen(false);
  };

  const title = loading
    ? "Loading catalog…"
    : empty
      ? "No catalog items in dashboard"
      : "Pick from catalog";

  const menu =
    open && menuPosition ? (
      <ul
        ref={menuRef}
        role="listbox"
        aria-label="Pick a Service"
        className="catalog-picker-menu catalog-picker-menu-floating"
        style={{
          top: menuPosition.top,
          left: menuPosition.left,
          minWidth: menuPosition.minWidth,
        }}
      >
        <li className="catalog-picker-menu-heading" aria-hidden>
          Pick a Service
        </li>
        {items.map((item) => (
          <li key={item.id} role="option">
            <button
              type="button"
              className="catalog-picker-menu-option"
              onClick={() => pick(item)}
            >
              {item.service} — {formatMoney(item.unitPrice)}
            </button>
          </li>
        ))}
      </ul>
    ) : null;

  return (
    <div ref={wrapRef} className="catalog-picker-wrap no-print" title={title}>
      <button
        ref={buttonRef}
        type="button"
        className={
          variant === "table"
            ? "catalog-picker-square catalog-picker-table"
            : "catalog-picker-square"
        }
        onClick={() => setOpen((value) => !value)}
        disabled={isDisabled}
        aria-label="Pick a Service"
        aria-expanded={open}
        aria-haspopup="listbox"
      />

      {typeof document !== "undefined" && menu
        ? createPortal(menu, document.body)
        : null}
    </div>
  );
}
