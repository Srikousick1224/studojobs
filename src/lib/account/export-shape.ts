/**
 * Shapes the "Download my data" file. Pure functions only (no database), so they can be unit tested.
 *
 * Privacy rules this file enforces:
 *  - internal storage paths are removed (they are not useful to the person and reveal how files are stored);
 *  - each section is labelled "unavailable" instead of failing the whole export when one table cannot be read.
 */
export const EXPORT_VERSION = 1;

type Row = Record<string, unknown>;
export type Section = { rows: Row[] } | { unavailable: true };

const INTERNAL_KEYS = ["storage_path"];

/** Returns copies of the rows without internal-only keys. */
export function stripInternal(rows: Row[], keys: string[] = INTERNAL_KEYS): Row[] {
  return rows.map((r) => Object.fromEntries(Object.entries(r).filter(([k]) => !keys.includes(k))));
}

export function section(result: { data: Row[] | null; error: unknown }): Section {
  return result.error || !result.data ? { unavailable: true } : { rows: stripInternal(result.data) };
}

export interface ExportInput {
  role: "student" | "employer";
  generatedAt: Date;
  account: { id: string; email: string };
  sections: Record<string, Section>;
}

export function shapeExport(input: ExportInput) {
  const out: Record<string, unknown> = {};
  for (const [name, s] of Object.entries(input.sections)) out[name] = "unavailable" in s ? { unavailable: true } : s.rows;
  return {
    studojob_export_version: EXPORT_VERSION,
    generated_at: input.generatedAt.toISOString(),
    role: input.role,
    account: input.account,
    note:
      input.role === "employer"
        ? "This file holds your own account, company and listings. It does not include candidates' applications or resumes, because that is their personal data."
        : "This file holds the information stored in your own account. Resume files are not included here; download them from your Profile page.",
    data: out,
  };
}

export const exportFileName = (role: string, now: Date) => `studojob-${role}-data-${now.toISOString().slice(0, 10)}.json`;
