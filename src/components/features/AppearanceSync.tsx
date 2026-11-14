"use client";

import { useEffect } from "react";
import { applyAppearance, useAppearance } from "@/lib/appearance/store";

/** Keeps <html> attributes in step with saved settings, and follows the operating-system theme live. */
export function AppearanceSync() {
  const appearance = useAppearance();

  useEffect(() => {
    applyAppearance(appearance);
    if (appearance.theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyAppearance(appearance);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [appearance]);

  return null;
}
