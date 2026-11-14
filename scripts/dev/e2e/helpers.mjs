// LOCAL DEV/TEST ONLY: shared helpers for browser checks against the local stand-in.
import { createRequire } from "node:module";
import { mint, cookieValue } from "../mint-session.mjs";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

export const BASE = process.env.APP_URL ?? "http://localhost:3060";
export const COOKIE_NAME = "sb-localhost-auth-token";

export async function launch() { return chromium.launch(); }

/** New isolated browser context, optionally signed in as a local test user. */
export async function context(browser, email, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, ...opts });
  if (email) {
    const value = cookieValue(await mint(email));
    await ctx.addCookies([{ name: COOKIE_NAME, value, url: BASE }]);
  }
  return ctx;
}

export function tracker() {
  let passed = 0, failed = 0;
  const failures = [];
  return {
    check(name, ok, detail = "") { if (ok) passed++; else { failed++; failures.push(name); } console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${!ok && detail ? "  -> " + detail : ""}`); },
    done() { console.log(`\n${passed} passed, ${failed} failed`); if (failed) console.log("FAILED:", failures.join(" | ")); return failed === 0; },
  };
}

/** Collects console errors and failed requests from a page so tests can assert there are none. */
export function watch(page) {
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/favicon|Failed to load resource.*(401|404)/.test(m.text())) errors.push("console: " + m.text()); });
  return errors;
}
