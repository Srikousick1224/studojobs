"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { updateAppearance, useAppearance } from "@/lib/appearance/store";
import type { Theme } from "@/lib/appearance/settings";

const next: Record<Theme, Theme> = { light: "dark", dark: "system", system: "light" };
const label: Record<Theme, string> = { light: "Light", dark: "Dark", system: "System" };

/** One button that cycles Light, Dark, System. */
export function ThemeToggle() {
  const { theme } = useAppearance();
  const Icon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;
  return (
    <button
      type="button"
      onClick={() => updateAppearance({ theme: next[theme] })}
      aria-label={`Theme: ${label[theme]}. Switch to ${label[next[theme]]}`}
      title={`Theme: ${label[theme]}`}
      className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-600 transition hover:bg-ink-100 hover:text-ink-900 active:scale-95"
    >
      <Icon key={theme} className="animate-pop h-5 w-5" aria-hidden="true" />
    </button>
  );
}
