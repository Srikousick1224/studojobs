/** Pure checks for an uploaded resume. Shared by the Server Action and the unit tests. */

export const MAX_RESUME_BYTES = 5 * 1024 * 1024;
export const MAX_RESUMES = 5;
const PDF = "application/pdf";
const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export type ResumeCheck = { ok: true; ext: "pdf" | "docx"; mime: string } | { ok: false; message: string };

/**
 * A browser tells us the file type, but anyone can lie about it. So we also look at the first bytes:
 * a PDF starts with "%PDF-", a Word .docx is a ZIP file and starts with "PK\x03\x04".
 */
export function checkResumeFile(f: { name: string; size: number; head: Uint8Array }): ResumeCheck {
  if (f.size < 1) return { ok: false, message: "That file is empty." };
  if (f.size > MAX_RESUME_BYTES) return { ok: false, message: "Your resume must be 5 MB or smaller." };
  const ext = f.name.toLowerCase().match(/\.(pdf|docx)$/)?.[1] as "pdf" | "docx" | undefined;
  if (!ext) return { ok: false, message: "Upload a PDF or a Word (.docx) file." };
  const h = f.head;
  const isPdf = h.length >= 5 && h[0] === 0x25 && h[1] === 0x50 && h[2] === 0x44 && h[3] === 0x46 && h[4] === 0x2d;
  const isZip = h.length >= 4 && h[0] === 0x50 && h[1] === 0x4b && h[2] === 0x03 && h[3] === 0x04;
  if (ext === "pdf" && !isPdf) return { ok: false, message: "This file is not a real PDF." };
  if (ext === "docx" && !isZip) return { ok: false, message: "This file is not a real Word (.docx) document." };
  return { ok: true, ext, mime: ext === "pdf" ? PDF : DOCX };
}

/** Label shown to the student and employers: trimmed, no control characters, at most 80 characters. */
export function cleanLabel(raw: string, fallbackFileName: string): string {
  const base = raw.trim() || fallbackFileName.replace(/\.(pdf|docx)$/i, "");
  return base.replace(/[\u0000-\u001f\u007f<>]/g, "").trim().slice(0, 80) || "Resume";
}

/** File name kept for display only (the stored name is random). */
export function cleanFileName(name: string): string {
  return name.replace(/[\u0000-\u001f\u007f<>\\/]/g, "").trim().slice(0, 200) || "resume";
}
