"use client";

import { useSyncExternalStore } from "react";

export type ViewMode = "card" | "table";

const subscribe = (callback: () => void) => {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
};

export function usePersistedViewMode(storageKey: string, initialMode: ViewMode = "card") {
  const viewMode = useSyncExternalStore(
    subscribe,
    () => {
      try {
        const saved = window.localStorage.getItem(storageKey);
        return saved === "card" || saved === "table" ? saved : initialMode;
      } catch {
        return initialMode;
      }
    },
    () => initialMode,
  );

  const updateViewMode = (nextMode: ViewMode) => {
    try {
      window.localStorage.setItem(storageKey, nextMode);
    } catch {
      // Ignore storage failures and still allow the next render to use the current in-memory value.
    }

    window.dispatchEvent(new Event("storage"));
  };

  return {
    viewMode,
    setViewMode: updateViewMode,
  };
}
