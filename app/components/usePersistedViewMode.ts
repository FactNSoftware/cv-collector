"use client";

import { useState } from "react";

export type ViewMode = "card" | "table";

export function usePersistedViewMode(storageKey: string, initialMode: ViewMode = "card") {
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === "undefined") {
      return initialMode;
    }

    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved === "card" || saved === "table") {
        return saved;
      }
    } catch {
      // Ignore storage failures and keep the default mode.
    }

    return initialMode;
  });

  const updateViewMode = (nextMode: ViewMode) => {
    setViewMode(nextMode);

    try {
      window.localStorage.setItem(storageKey, nextMode);
    } catch {
      // Ignore storage failures and still update local state.
    }
  };

  return {
    viewMode,
    setViewMode: updateViewMode,
  };
}
