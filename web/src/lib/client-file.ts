"use client";

// Browser-only helpers for the upload check. The file is never sent to the server.

let pending: File | null = null;

/** Hands a picked file from the home/scan page to /check without uploading it. */
export function setPendingFile(f: File | null) {
  pending = f;
}
export function takePendingFile(): File | null {
  const f = pending;
  pending = null;
  return f;
}

export const MAX_BYTES = 20 * 1024 * 1024;

/** SHA-256 of the exact file bytes, as 0x-prefixed lowercase hex. */
export async function sha256File(file: Blob): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return "0x" + Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Reads the YuProof document ID (YP-YYYY-NNNNNN) from the PDF's text or metadata, if present. */
export async function readDocIdFromPdf(file: Blob): Promise<string | null> {
  const re = /\bYP-\d{4}-\d{6}\b/;
  try {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
    const doc = await task.promise;
    try {
      const meta = await doc.getMetadata().catch(() => null);
      const info = (meta?.info ?? {}) as Record<string, unknown>;
      for (const k of ["Subject", "Keywords", "Title"]) {
        const m = typeof info[k] === "string" ? (info[k] as string).match(re) : null;
        if (m) return m[0];
      }
      for (let p = 1; p <= Math.min(doc.numPages, 3); p++) {
        const page = await doc.getPage(p);
        const content = await page.getTextContent();
        const text = content.items.map((i) => ("str" in i ? i.str : "")).join(" ");
        const m = text.match(re);
        if (m) return m[0];
      }
    } finally {
      await task.destroy();
    }
  } catch {
    // Not a readable PDF (e.g. a photo). Fall through: the hash is still checked.
  }
  return null;
}
