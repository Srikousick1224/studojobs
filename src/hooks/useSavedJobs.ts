"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

/**
 * Real saved-jobs feature. Until accounts exist (Phase 2) the list is kept
 * in this browser's localStorage; later it moves to the `saved_jobs` table.
 */
const KEY = "studojob:saved-jobs";
const listeners = new Set<() => void>();

function read(): string {
  try {
    return window.localStorage.getItem(KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

export function useSavedJobs() {
  const raw = useSyncExternalStore(subscribe, read, () => "[]");
  const ids = useMemo<string[]>(() => {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
    } catch {
      return [];
    }
  }, [raw]);

  const toggle = useCallback((id: string) => {
    const current: string[] = (() => {
      try {
        return JSON.parse(read());
      } catch {
        return [];
      }
    })();
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* storage blocked — nothing to persist */
    }
    listeners.forEach((l) => l());
  }, []);

  return { ids, isSaved: (id: string) => ids.includes(id), toggle };
}
