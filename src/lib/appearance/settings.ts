/** Appearance settings: pure logic (no React, no DOM) so it can be unit-tested. */

export const THEMES = ["system", "light", "dark"] as const;
export const ACCENTS = ["violet", "ocean", "rose", "forest", "amber", "custom"] as const;
export const SCALES = [90, 100, 112, 125] as const;
export const RADII = ["sharp", "soft", "round"] as const;
export const FONTS = ["studo", "system", "serif"] as const;
export const MOTIONS = ["system", "reduce", "full"] as const;
export const BUTTONS = ["solid", "gradient", "outline", "glow"] as const;
export const EFFECTS = ["none", "subtle", "lively"] as const;
export const BACKGROUNDS = ["plain", "aurora", "grid", "dots"] as const;

export type Theme = (typeof THEMES)[number];
export type Accent = (typeof ACCENTS)[number];
export type Scale = (typeof SCALES)[number];
export type Radius = (typeof RADII)[number];
export type FontChoice = (typeof FONTS)[number];
export type Motion = (typeof MOTIONS)[number];
export type ButtonStyle = (typeof BUTTONS)[number];
export type Effects = (typeof EFFECTS)[number];
export type Background = (typeof BACKGROUNDS)[number];

export interface Appearance {
  theme: Theme;
  accent: Accent;
  scale: Scale;
  radius: Radius;
  font: FontChoice;
  motion: Motion;
  contrast: boolean;
  button: ButtonStyle;
  effects: Effects;
  background: Background;
  /** 0–360, used when accent is "custom" */
  customHue: number;
}

export const STORAGE_KEY = "studojob.appearance.v1";

export const DEFAULT_APPEARANCE: Appearance = {
  theme: "system",
  accent: "violet",
  scale: 100,
  radius: "round",
  font: "studo",
  motion: "system",
  contrast: false,
  button: "solid",
  effects: "lively",
  background: "aurora",
  customHue: 262,
};

function pick<T extends string | number>(list: readonly T[], value: unknown, fallback: T): T {
  return list.includes(value as T) ? (value as T) : fallback;
}

/** Turns anything stored in the browser into a safe, complete settings object. */
export function sanitizeAppearance(input: unknown): Appearance {
  const o = typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
  const d = DEFAULT_APPEARANCE;
  return {
    theme: pick(THEMES, o.theme, d.theme),
    accent: pick(ACCENTS, o.accent, d.accent),
    scale: pick(SCALES, o.scale, d.scale),
    radius: pick(RADII, o.radius, d.radius),
    font: pick(FONTS, o.font, d.font),
    motion: pick(MOTIONS, o.motion, d.motion),
    contrast: o.contrast === true,
    button: pick(BUTTONS, o.button, d.button),
    effects: pick(EFFECTS, o.effects, d.effects),
    background: pick(BACKGROUNDS, o.background, d.background),
    customHue: typeof o.customHue === "number" && Number.isFinite(o.customHue) ? Math.min(360, Math.max(0, Math.round(o.customHue))) : d.customHue,
  };
}

export function parseAppearance(raw: string | null): Appearance {
  if (!raw) return DEFAULT_APPEARANCE;
  try {
    return sanitizeAppearance(JSON.parse(raw));
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

export function resolveTheme(theme: Theme, systemPrefersDark: boolean): "light" | "dark" {
  return theme === "system" ? (systemPrefersDark ? "dark" : "light") : theme;
}

/** The data-attributes written on <html>. Default values are omitted so the base design is untouched. */
export function toAttributes(a: Appearance, systemPrefersDark: boolean): Record<string, string | null> {
  return {
    "data-theme": resolveTheme(a.theme, systemPrefersDark),
    "data-accent": a.accent === "violet" ? null : a.accent,
    "data-radius": a.radius === "round" ? null : a.radius,
    "data-font": a.font === "studo" ? null : a.font,
    "data-motion": a.motion === "system" ? null : a.motion,
    "data-contrast": a.contrast ? "high" : null,
    "data-scale": a.scale === 100 ? null : String(a.scale),
    // These three are always written, because their default look (lively + aurora) is itself an effect.
    "data-button": a.button === "solid" ? null : a.button,
    "data-fx": a.effects,
    "data-bg": a.background,
  };
}

export const ACCENT_SWATCH: Record<Accent, string> = {
  violet: "#6d4aff",
  ocean: "#1d7df0",
  rose: "#e0357a",
  forest: "#15915b",
  amber: "#d98206",
  custom: "#6d4aff",
};

export const ACCENT_LABEL: Record<Accent, string> = {
  violet: "Violet",
  ocean: "Ocean",
  rose: "Rose",
  forest: "Forest",
  amber: "Amber",
  custom: "Custom",
};

/** One-click looks. Each preset only sets visual fields, never anything private. */
export const PRESETS: { id: string; label: string; blurb: string; values: Partial<Appearance> }[] = [
  { id: "default", label: "StudoJob", blurb: "The original violet look", values: { theme: "system", accent: "violet", button: "solid", background: "aurora", effects: "lively", radius: "round" } },
  { id: "midnight", label: "Midnight", blurb: "Dark, glowing, electric blue", values: { theme: "dark", accent: "ocean", button: "glow", background: "grid", effects: "lively", radius: "round" } },
  { id: "sunrise", label: "Sunrise", blurb: "Warm rose gradients", values: { theme: "light", accent: "rose", button: "gradient", background: "aurora", effects: "lively", radius: "round" } },
  { id: "forest", label: "Forest", blurb: "Calm green, soft corners", values: { theme: "light", accent: "forest", button: "solid", background: "dots", effects: "subtle", radius: "soft" } },
  { id: "focus", label: "Focus", blurb: "Plain, sharp, no distractions", values: { theme: "light", accent: "violet", button: "outline", background: "plain", effects: "none", radius: "sharp" } },
];

/**
 * Runs before the first paint (inlined in <head>) so a saved theme never flashes.
 * Kept as a plain string: it cannot import anything. Tests run it against a fake document.
 */
export const INIT_SCRIPT = `(function(){try{var d=document.documentElement;d.classList.add("js");var s=localStorage.getItem(${JSON.stringify(
  STORAGE_KEY,
)}),a=s?JSON.parse(s):{};function p(l,v,f){return l.indexOf(v)>-1?v:f}var th=p(["system","light","dark"],a.theme,"system"),dark=window.matchMedia&&matchMedia("(prefers-color-scheme: dark)").matches;d.setAttribute("data-theme",th==="system"?(dark?"dark":"light"):th);function o(n,v,def){if(v===def)d.removeAttribute(n);else d.setAttribute(n,String(v))}var ac=p(["violet","ocean","rose","forest","amber","custom"],a.accent,"violet");o("data-accent",ac,"violet");if(ac==="custom"&&typeof a.customHue==="number"&&isFinite(a.customHue)){d.style.setProperty("--h",String(Math.min(360,Math.max(0,Math.round(a.customHue)))))}else{d.style.removeProperty("--h")}o("data-radius",p(["sharp","soft","round"],a.radius,"round"),"round");o("data-font",p(["studo","system","serif"],a.font,"studo"),"studo");o("data-motion",p(["system","reduce","full"],a.motion,"system"),"system");o("data-scale",p([90,100,112,125],a.scale,100),100);o("data-contrast",a.contrast===true?"high":"","");o("data-button",p(["solid","gradient","outline","glow"],a.button,"solid"),"solid");d.setAttribute("data-fx",p(["none","subtle","lively"],a.effects,"lively"));d.setAttribute("data-bg",p(["plain","aurora","grid","dots"],a.background,"aurora"))}catch(e){}})();`;
