// Generates SAMPLE certificate PDFs for local testing (not the real issuing template; that is milestone 3).
import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";
import QRCode from "qrcode";

const blue = rgb(0x2b / 255, 0x39 / 255, 0x90 / 255);
const green = rgb(0x0e / 255, 0x9f / 255, 0x6e / 255);
const gold = rgb(0xb8 / 255, 0x89 / 255, 0x2e / 255);
const navy = rgb(0x14 / 255, 0x1a / 255, 0x3d / 255);
const muted = rgb(0x4a / 255, 0x53 / 255, 0x68 / 255);
const cream = rgb(0xfb / 255, 0xf8 / 255, 0xf1 / 255);

export interface SampleDoc {
  id: string | null; // null = a PDF that was never issued on YuProof
  issuer: string;
  title: string;
  holder: string;
  lines: string[];
  issuedOn: string;
}

export async function samplePdf(doc: SampleDoc, baseUrl: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${doc.title} - ${doc.holder}`);
  if (doc.id) pdf.setSubject(doc.id);
  pdf.setProducer("YuProof sample generator");
  // Fixed dates keep the bytes (and so the fingerprint) stable for the same input.
  pdf.setCreationDate(new Date("2026-06-12T10:00:00Z"));
  pdf.setModificationDate(new Date("2026-06-12T10:00:00Z"));

  const page = pdf.addPage([841.89, 595.28]); // A4 landscape
  const { width, height } = page.getSize();
  const serif = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const sansBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const mono = await pdf.embedFont(StandardFonts.Courier);

  page.drawRectangle({ x: 0, y: 0, width, height, color: cream });
  for (let x = 0, i = 0; x < width; x += 18, i++) {
    page.drawRectangle({ x, y: height - 10, width: 18, height: 10, color: [blue, green, gold][i % 3] });
  }
  page.drawText("SAMPLE - NOT A REAL DOCUMENT", {
    x: 150, y: 120, size: 46, font: sansBold, color: rgb(0.85, 0.82, 0.76), rotate: degrees(20), opacity: 0.6,
  });

  const center = (s: string, y: number, size: number, font = sans, color = navy) =>
    page.drawText(s, { x: (width - font.widthOfTextAtSize(s, size)) / 2, y, size, font, color });

  center(doc.issuer, height - 80, 22, serif, blue);
  center(doc.title, height - 150, 30, serif);
  center("This is to certify that", height - 200, 13, sans, muted);
  center(doc.holder, height - 245, 34, serif);
  doc.lines.forEach((l, i) => center(l, height - 290 - i * 22, 13));
  page.drawText(`Issued ${doc.issuedOn}`, { x: 60, y: 70, size: 11, font: sans, color: muted });
  page.drawText("Registrar (sample signature)", { x: width - 260, y: 70, size: 11, font: sans, color: muted });

  if (doc.id) {
    const url = `${baseUrl}/v/${doc.id}`;
    const png = await QRCode.toBuffer(url, { margin: 1, width: 300, errorCorrectionLevel: "M" });
    const qr = await pdf.embedPng(png);
    page.drawImage(qr, { x: width - 150, y: height - 170, width: 100, height: 100 });
    page.drawText(doc.id, { x: width - 150, y: height - 186, size: 10, font: mono, color: navy });
    page.drawText("Verify at YuProof", { x: width - 150, y: height - 200, size: 8, font: sans, color: muted });
  }
  return pdf.save({ useObjectStreams: false });
}
