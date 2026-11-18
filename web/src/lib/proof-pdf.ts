import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import QRCode from "qrcode";
import type { VerifyResponse } from "./types";

const C = {
  blue: rgb(0x2b / 255, 0x39 / 255, 0x90 / 255),
  green: rgb(0x0e / 255, 0x9f / 255, 0x6e / 255),
  amber: rgb(0xb4 / 255, 0x53 / 255, 0x09 / 255),
  navy: rgb(0x14 / 255, 0x1a / 255, 0x3d / 255),
  muted: rgb(0x4a / 255, 0x53 / 255, 0x68 / 255),
  border: rgb(0xe4 / 255, 0xe8 / 255, 0xf3 / 255),
  white: rgb(1, 1, 1),
};

/** Standard PDF fonts only cover Latin-1; replace anything else so generation never fails. */
const safe = (s: string) => s.replace(/[^\x20-\x7E -ÿ–—‘’“”•…]/g, "?");

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }) + " IST";

/** Builds a one-page PDF verification report for a Genuine or Cancelled result. */
export async function buildProofPdf(r: VerifyResponse, verifyUrl: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`YuProof verification report ${r.document?.id ?? ""}`);
  pdf.setProducer("YuProof");
  pdf.setCreator("YuProof by Yubhian Technologies LLP");
  const page = pdf.addPage([595.28, 841.89]); // A4
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const mono = await pdf.embedFont(StandardFonts.Courier);
  const { width, height } = page.getSize();
  const M = 48;

  // Header band
  page.drawRectangle({ x: 0, y: height - 120, width, height: 120, color: C.blue });
  text(page, "YuProof", M, height - 58, bold, 24, C.white);
  text(page, "Document verification report", M, height - 84, font, 13, C.white);
  if (r.isSample) text(page, "SAMPLE DATA", width - M - 90, height - 58, bold, 11, C.white);

  // Result
  const genuine = r.result === "genuine";
  const colour = genuine ? C.green : C.amber;
  let y = height - 175;
  page.drawCircle({ x: M + 18, y: y + 8, size: 18, color: colour });
  if (genuine) {
    page.drawLine({ start: { x: M + 9, y: y + 8 }, end: { x: M + 15, y: y + 2 }, thickness: 3.2, color: C.white });
    page.drawLine({ start: { x: M + 15, y: y + 2 }, end: { x: M + 27, y: y + 15 }, thickness: 3.2, color: C.white });
  } else {
    page.drawLine({ start: { x: M + 9, y: y + 8 }, end: { x: M + 27, y: y + 8 }, thickness: 3.2, color: C.white });
  }
  text(page, genuine ? "GENUINE" : "CANCELLED BY ISSUER", M + 48, y, bold, 22, colour);
  y -= 22;
  const sub = genuine
    ? r.checks?.issuer
      ? "The record exists on the blockchain, the issuer is verified and the document is not cancelled."
      : "The record exists on the blockchain and is not cancelled. The issuer is currently not verified."
    : "The issuer cancelled this document. Accept only the replacement, if one is listed.";
  y = para(page, sub, M + 48, y, font, 10.5, C.muted, width - 2 * M - 48);

  // Sections
  y -= 22;
  const d = r.document!;
  y = section(page, "Document", y, M, width, bold);
  y = rows(page, y, M, font, bold, mono, [
    ["Holder", d.holderName],
    ["Document", d.title],
    ["Document ID", d.id, true],
    ["Issued", fmt(d.issuedAt)],
  ]);
  y = section(page, "Issuer", y, M, width, bold);
  y = rows(page, y, M, font, bold, mono, [
    ["Name", r.issuer!.name],
    ["Status", r.issuer!.verified ? "Verified issuer (approved on chain)" : `Not verified (${r.issuer!.status})`],
  ]);
  if (r.cancel) {
    y = section(page, "Cancellation", y, M, width, bold);
    y = rows(page, y, M, font, bold, mono, [
      ["Cancelled", r.cancel.at ? fmt(r.cancel.at) : "Recorded on chain"],
      ["Reason", r.cancel.reason ?? "Not given"],
      ["Replacement", r.cancel.replacementId ?? "None", true],
    ]);
  }
  const ch = r.chain!;
  y = section(page, "Blockchain record", y, M, width, bold);
  y = rows(page, y, M, font, bold, mono, [
    ["Network", ch.network],
    ["Contract", ch.contract, true],
    ...(ch.txHash ? ([["Transaction", ch.txHash, true]] as Row[]) : []),
    ...(ch.block !== null ? ([["Block", String(ch.block)]] as Row[]) : []),
    ...(ch.batchId !== null ? ([["Batch", `#${ch.batchId}`]] as Row[]) : []),
    ...(ch.merkleRoot ? ([["Merkle root", ch.merkleRoot, true]] as Row[]) : []),
    ["SHA-256", d.hash, true],
  ]);
  y = section(page, "This report", y, M, width, bold);
  y = rows(page, y, M, font, bold, mono, [["Checked", fmt(r.checkedAt)]]);

  // QR to re-check live
  const qrPng = await QRCode.toBuffer(verifyUrl, { margin: 1, width: 300, errorCorrectionLevel: "M" });
  const qr = await pdf.embedPng(qrPng);
  const qy = Math.max(70, y - 110);
  page.drawImage(qr, { x: M, y: qy, width: 96, height: 96 });
  text(page, "Check the current status", M + 112, qy + 70, bold, 11, C.navy);
  para(page, "This report shows the record at the time above. Scan the code or open:", M + 112, qy + 54, font, 10, C.muted, width - 2 * M - 112);
  text(page, safe(verifyUrl), M + 112, qy + 26, mono, 9, C.blue);

  page.drawLine({ start: { x: M, y: 50 }, end: { x: width - M, y: 50 }, thickness: 0.6, color: C.border });
  text(
    page,
    "YuProof by Yubhian Technologies LLP. Only document fingerprints are stored on the blockchain; no personal data.",
    M,
    36,
    font,
    8.5,
    C.muted,
  );
  return pdf.save();
}

type Row = [string, string, boolean?];

function text(page: PDFPage, s: string, x: number, y: number, f: PDFFont, size: number, color = C.navy) {
  page.drawText(safe(s), { x, y, font: f, size, color });
}

function para(page: PDFPage, s: string, x: number, y: number, f: PDFFont, size: number, color: ReturnType<typeof rgb>, maxW: number) {
  let line = "";
  for (const word of safe(s).split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (f.widthOfTextAtSize(next, size) > maxW && line) {
      page.drawText(line, { x, y, font: f, size, color });
      y -= size * 1.45;
      line = word;
    } else line = next;
  }
  if (line) page.drawText(line, { x, y, font: f, size, color });
  return y - size * 1.45;
}

function section(page: PDFPage, title: string, y: number, M: number, width: number, bold: PDFFont) {
  page.drawText(title.toUpperCase(), { x: M, y, font: bold, size: 9, color: C.muted });
  page.drawLine({ start: { x: M, y: y - 6 }, end: { x: width - M, y: y - 6 }, thickness: 0.6, color: C.border });
  return y - 24;
}

function rows(page: PDFPage, y: number, M: number, font: PDFFont, bold: PDFFont, mono: PDFFont, data: Row[]) {
  for (const [k, v, isMono] of data) {
    page.drawText(k, { x: M, y, font: bold, size: 10, color: C.muted });
    const f = isMono ? mono : font;
    const size = isMono && v.length > 50 ? 8 : 10.5;
    page.drawText(safe(v), { x: M + 110, y, font: f, size, color: C.navy });
    y -= 18;
  }
  return y - 10;
}
