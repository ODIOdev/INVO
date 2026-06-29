"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  filterCatalogClients,
  type CatalogClient,
} from "@/lib/catalog-clients";

type ClientNameAutocompleteProps = {
  clients: CatalogClient[];
  value: string;
  onChange: (value: string) => void;
  onSelect: (client: CatalogClient) => void;
  placeholder?: string;
};

export default function ClientNameAutocomplete({
  clients,
  value,
  onChange,
  onSelect,
  placeholder = "Client name",
}: ClientNameAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  const suggestions = useMemo(
    () => filterCatalogClients(clients, value),
    [clients, value]
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [value, suggestions.length]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  const pick = (client: CatalogClient) => {
    onSelect(client);
    setOpen(false);
  };

  const showList = open && suggestions.length > 0;

  return (
    <div ref={wrapRef} className="client-autocomplete no-print">
      <input
        className="field"
        placeholder={placeholder}
        value={value}
        autoComplete="off"
        role="combobox"
        aria-expanded={showList}
        aria-controls="client-name-suggestions"
        aria-autocomplete="list"
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!showList) {
            if (e.key === "ArrowDown" && suggestions.length > 0) {
              setOpen(true);
            }
            return;
          }

          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((index) =>
              index + 1 >= suggestions.length ? 0 : index + 1
            );
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((index) =>
              index - 1 < 0 ? suggestions.length - 1 : index - 1
            );
          } else if (e.key === "Enter") {
            e.preventDefault();
            const client = suggestions[activeIndex];
            if (client) pick(client);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />

      {showList ? (
        <ul
          id="client-name-suggestions"
          role="listbox"
          className="client-autocomplete-list"
        >
          {suggestions.map((client, index) => (
            <li key={client.id} role="option" aria-selected={index === activeIndex}>
              <button
                type="button"
                className={`client-autocomplete-option ${
                  index === activeIndex ? "client-autocomplete-option-active" : ""
                }`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(client)}
                onMouseEnter={() => setActiveIndex(index)}
              >
                <span className="block truncate font-medium text-zinc-900">
                  {client.clientName}
                </span>
                {client.companyName || client.email ? (
                  <span className="mt-0.5 block truncate text-xs text-zinc-500">
                    {[client.companyName, client.email].filter(Boolean).join(" · ")}
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
