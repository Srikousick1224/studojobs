import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_APPEARANCE, INIT_SCRIPT, STORAGE_KEY, parseAppearance, resolveTheme, sanitizeAppearance, toAttributes } from "../src/lib/appearance/settings";
import { convertPay, toLpa } from "../src/lib/tools/pay";
import { filterItems } from "../src/lib/palette-filter";

test("sanitize rejects unknown values and keeps valid ones", () => {
  assert.deepEqual(sanitizeAppearance(null), DEFAULT_APPEARANCE);
  assert.deepEqual(sanitizeAppearance("junk"), DEFAULT_APPEARANCE);
  const a = sanitizeAppearance({ theme: "dark", accent: "<script>", scale: 112, radius: "pill", font: "serif", motion: "reduce", contrast: "yes" });
  assert.equal(a.theme, "dark");
  assert.equal(a.accent, "violet");
  assert.equal(a.scale, 112);
  assert.equal(a.radius, "round");
  assert.equal(a.font, "serif");
  assert.equal(a.motion, "reduce");
  assert.equal(a.contrast, false);
});

test("parseAppearance survives broken storage", () => {
  assert.deepEqual(parseAppearance(null), DEFAULT_APPEARANCE);
  assert.deepEqual(parseAppearance("{not json"), DEFAULT_APPEARANCE);
  assert.equal(parseAppearance('{"theme":"light"}').theme, "light");
});

test("theme resolution and default attributes", () => {
  assert.equal(resolveTheme("system", true), "dark");
  assert.equal(resolveTheme("system", false), "light");
  assert.equal(resolveTheme("light", true), "light");
  const attrs = toAttributes(DEFAULT_APPEARANCE, false);
  assert.equal(attrs["data-theme"], "light");
  for (const k of ["data-accent", "data-radius", "data-font", "data-motion", "data-contrast", "data-scale"]) assert.equal(attrs[k], null);
  const custom = toAttributes({ ...DEFAULT_APPEARANCE, accent: "rose", scale: 125, contrast: true }, true);
  assert.equal(custom["data-accent"], "rose");
  assert.equal(custom["data-scale"], "125");
  assert.equal(custom["data-contrast"], "high");
  assert.equal(custom["data-theme"], "dark");
});

let lastStyles = new Map<string, string>();
function runInitScript(stored: string | null, prefersDark: boolean) {
  const attrs = new Map<string, string>();
  const styles = new Map<string, string>();
  const documentElement = {
    setAttribute: (k: string, v: string) => attrs.set(k, v),
    removeAttribute: (k: string) => attrs.delete(k),
    style: { setProperty: (k: string, v: string) => styles.set(k, v), removeProperty: (k: string) => styles.delete(k) },
  };
  lastStyles = styles;
  const fake = {
    document: { documentElement },
    localStorage: { getItem: (k: string) => (k === STORAGE_KEY ? stored : null) },
    window: { matchMedia: () => ({ matches: prefersDark }) },
    matchMedia: () => ({ matches: prefersDark }),
  };
  new Function("document", "localStorage", "window", "matchMedia", INIT_SCRIPT)(fake.document, fake.localStorage, fake.window, fake.matchMedia);
  return attrs;
}

test("the pre-paint script matches the typed logic", () => {
  const saved = { theme: "dark", accent: "forest", scale: 112, radius: "sharp", font: "system", motion: "reduce", contrast: true, button: "glow", effects: "subtle", background: "grid" };
  const attrs = runInitScript(JSON.stringify(saved), false);
  const expected = toAttributes(sanitizeAppearance(saved), false);
  for (const [k, v] of Object.entries(expected)) assert.equal(attrs.get(k) ?? null, v, k);
  const fresh = runInitScript(null, true);
  assert.equal(fresh.get("data-theme"), "dark");
  assert.equal(fresh.has("data-accent"), false);
  const hostile = runInitScript('{"theme":"x\\"><b>","accent":"evil"}', false);
  assert.equal(hostile.get("data-theme"), "light");
  assert.equal(hostile.has("data-accent"), false);
  assert.doesNotThrow(() => runInitScript("{broken", false));
});

test("new settings: defaults, custom colour, hostile values", () => {
  const d = toAttributes(DEFAULT_APPEARANCE, false);
  assert.equal(d["data-button"], null);
  assert.equal(d["data-fx"], "lively");
  assert.equal(d["data-bg"], "aurora");
  const c = sanitizeAppearance({ accent: "custom", customHue: 999.6, button: "gradient", background: "dots", effects: "none" });
  assert.equal(c.customHue, 360);
  assert.equal(toAttributes(c, false)["data-accent"], "custom");
  assert.equal(sanitizeAppearance({ customHue: "red", button: "x", effects: 5, background: {} }).customHue, 262);
  assert.equal(sanitizeAppearance({ button: "x" }).button, "solid");
  const attrs = runInitScript(JSON.stringify({ accent: "custom", customHue: 120, effects: "none", background: "plain", button: "outline" }), false);
  assert.equal(lastStyles.get("--h"), "120");
  assert.equal(attrs.get("data-fx"), "none");
  assert.equal(attrs.get("data-bg"), "plain");
  assert.equal(attrs.get("data-button"), "outline");
  runInitScript(JSON.stringify({ accent: "ocean" }), false);
  assert.equal(lastStyles.has("--h"), false);
  runInitScript('{"customHue":"1;background:red","accent":"custom"}', false);
  assert.equal(lastStyles.has("--h"), false);
});

test("pay conversion", () => {
  const m = convertPay({ amount: 15000, unit: "month", hoursPerWeek: 40 })!;
  assert.equal(m.year, 180000);
  assert.equal(toLpa(m.year), 1.8);
  assert.ok(Math.abs(m.hour - 180000 / (40 * 52)) < 1e-9);
  const y = convertPay({ amount: 600000, unit: "year", hoursPerWeek: 40 })!;
  assert.equal(y.month, 50000);
  const h = convertPay({ amount: 200, unit: "hour", hoursPerWeek: 20 })!;
  assert.equal(h.year, 200 * 20 * 52);
  assert.equal(convertPay({ amount: -1, unit: "month", hoursPerWeek: 40 }), null);
  assert.equal(convertPay({ amount: 100, unit: "month", hoursPerWeek: 0 }), null);
  assert.equal(convertPay({ amount: NaN, unit: "month", hoursPerWeek: 40 }), null);
  assert.equal(convertPay({ amount: 100, unit: "month", hoursPerWeek: 100 }), null);
});

test("palette filter needs every word", () => {
  const items = [{ label: "Theme: Dark" }, { label: "Accent colour: Rose" }, { label: "Jobs" }];
  assert.equal(filterItems(items, "").length, 3);
  assert.deepEqual(filterItems(items, "dark theme").map((i) => i.label), ["Theme: Dark"]);
  assert.equal(filterItems(items, "zzz").length, 0);
});
