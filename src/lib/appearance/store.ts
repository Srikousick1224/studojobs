"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_APPEARANCE, STORAGE_KEY, parseAppearance, sanitizeAppearance, toAttributes, type Appearance } from "./settings";

/** Tiny external store: settings live in localStorage and every open tab stays in sync. */
const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cached: Appearance = DEFAULT_APPEARANCE;

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function getSnapshot(): Appearance {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cached = parseAppearance(raw);
  }
  return cached;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === null) cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function useAppearance(): Appearance {
  return useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_APPEARANCE);
}

export function updateAppearance(patch: Partial<Appearance>) {
  const next = sanitizeAppearance({ ...getSnapshot(), ...patch });
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* storage blocked: the change still applies until the page closes */
  }
  cachedRaw = undefined;
  cached = next;
  applyAppearance(next);
  listeners.forEach((l) => l());
}

export function resetAppearance() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  cachedRaw = undefined;
  cached = DEFAULT_APPEARANCE;
  applyAppearance(DEFAULT_APPEARANCE);
  listeners.forEach((l) => l());
}

export function systemPrefersDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function applyAppearance(a: Appearance) {
  const root = document.documentElement;
  const attrs = toAttributes(a, systemPrefersDark());
  for (const [name, value] of Object.entries(attrs)) {
    if (value === null) root.removeAttribute(name);
    else root.setAttribute(name, value);
  }
  if (a.accent === "custom") root.style.setProperty("--h", String(a.customHue));
  else root.style.removeProperty("--h");
}
