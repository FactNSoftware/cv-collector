"use client";

import { LayoutGrid, Rows3 } from "lucide-react";
import type { ViewMode } from "./usePersistedViewMode";

type AdminViewModeToggleProps = {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
};

export function AdminViewModeToggle({
  value,
  onChange,
}: AdminViewModeToggleProps) {
  return (
    <div className="inline-flex rounded-2xl border border-[var(--color-border)] bg-white p-1 shadow-sm">
      <button
        type="button"
        onClick={() => onChange("card")}
        className={`inline-flex items-center rounded-xl px-3 py-2 text-sm font-medium transition ${value === "card" ? "theme-btn-primary" : "text-[var(--color-ink)]"}`}
      >
        <LayoutGrid className="mr-2 h-4 w-4" />
        Cards
      </button>
      <button
        type="button"
        onClick={() => onChange("table")}
        className={`inline-flex items-center rounded-xl px-3 py-2 text-sm font-medium transition ${value === "table" ? "theme-btn-primary" : "text-[var(--color-ink)]"}`}
      >
        <Rows3 className="mr-2 h-4 w-4" />
        Table
      </button>
    </div>
  );
}
