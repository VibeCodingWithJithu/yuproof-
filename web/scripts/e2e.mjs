// Browser smoke test for milestone 2 (needs `npm run seed` + `npm run dev` running, and Chrome or Edge installed).
//   node scripts/e2e.mjs [outDir]
// Uploads each sample PDF through the real UI (hash + ID read in the browser), checks the result headline,
// opens the QR/ID/share routes, and saves 390×844 screenshots for comparison with screens/png.
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const OUT = resolve(process.argv[2] ?? ".data/screens");
const SAMPLES = resolve("samples");
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: process.env.E2E_CHANNEL ?? "chrome" });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

let failed = 0;
const expectHeadline = async (name, text) => {
  const h1 = page.locator("h1").first();
  await h1.waitFor({ timeout: 20000 });
  await page.waitForFunction((t) => document.querySelector("h1")?.textContent?.includes(t), text, { timeout: 20000 }).catch(() => {});
  const got = (await h1.textContent())?.trim();
  const ok = got?.includes(text);
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}: "${got}"`);
};
const shot = (name) => page.screenshot({ path: join(OUT, `${name}.png`), fullPage: false });

// Home
await page.goto(BASE + "/");
await expectHeadline("home", "Is this certificate real?");
await shot("Main");

// Upload flows
const uploads = [
  ["genuine-degree-YP-2026-004213.pdf", "Genuine", "Upload-Genuine"],
  ["tampered-marksheet-YP-2026-004215.pdf", "Doesn't match", "Final-Tampered"],
  ["cancelled-tc-YP-2026-004214.pdf", "Cancelled", "Upload-Cancelled"],
  ["not-issued.pdf", "Not found", "Upload-NotFound"],
];
for (const [file, headline, name] of uploads) {
  await page.goto(BASE + "/");
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Upload PDF" }).click();
  await (await chooser).setFiles(join(SAMPLES, file));
  await page.waitForURL("**/check");
  await page.waitForTimeout(600);
  if (name === "Upload-Genuine") await shot("VerifyChecking");
  await expectHeadline(`upload ${file}`, headline);
  await page.waitForTimeout(300);
  await shot(name);
}

// QR / ID / share routes
for (const [path, headline, name] of [
  ["/v/YP-2026-004213", "Genuine", "Final-Genuine"],
  ["/v/YP-2026-004214", "Cancelled", "VerifyCancelled"],
  ["/v/YP-2026-000000?via=id", "Not found", "VerifyNotFound"],
  ["/s/demo-share-ananya", "Genuine", "Share-Genuine"],
]) {
  await page.goto(BASE + path);
  await expectHeadline(path, headline);
  await page.waitForTimeout(300);
  await shot(name);
}

// Typed ID from the home page
await page.goto(BASE + "/");
await page.getByLabel("Or enter the document ID").fill("yp-2026-004601");
await page.getByRole("button", { name: "Check", exact: true }).click();
await expectHeadline("typed ID", "Genuine");

// Scan screen (no camera in headless: shows the fallback text)
await page.goto(BASE + "/scan");
await expectHeadline("scan", "Scan the QR code");
await page.waitForTimeout(500);
await shot("VerifyScan");

await browser.close();
if (errors.length) console.log("Page errors:\n  " + errors.join("\n  "));
console.log(`\nScreenshots: ${OUT}`);
process.exit(failed || errors.length ? 1 : 0);
