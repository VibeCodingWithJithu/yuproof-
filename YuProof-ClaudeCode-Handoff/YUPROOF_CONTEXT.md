# YuProof: project context for Claude Code

## What YuProof is
A product of **Yubhian Technologies LLP** (Kaikaluru, Andhra Pradesh), sister product to **YuCampus** (accreditation workspace for NAAC/NBA/NIRF/AISHE).

YuProof lets approved issuers (colleges, institutes, companies) issue tamper-proof documents (degrees, mark sheets, internship and experience letters, course certificates). Anyone verifies them in seconds by scanning a QR code or uploading the PDF.

- Only a SHA-256 fingerprint (hash) of each document goes on a public blockchain (Polygon). Personal data never goes on-chain; it stays in a database in India.
- Results: **Genuine**, **Tampered / fake**, or **Cancelled by issuer**, plus the issuer's verified name.
- No coin or token. The blockchain is only a public, permanent record.
- Status: **in development**. The website says "Coming soon · Free pilots open".

## Users
| User | Does |
|---|---|
| Issuer (college, institute, company) | Completes KYC, issues documents in bulk from Excel or from YuCampus, can cancel |
| Holder (student, employee) | Keeps documents in a wallet, shares a link (can expire) |
| Verifier (employer, university) | Scans QR or uploads PDF; HR can bulk-check a batch |
| Admin (Yubhian) | Approves issuers, manages the warning list |

## Brand
- Logo: "Linked Blocks" mark (outlined blue block behind, green block with white tick in front) + wordmark "YuProof" ("Yu" in Yu Blue, "Proof" in Navy Ink)
- Colours: Yu Blue `#2B3990` (same as YuCampus), Verified Green `#0E9F6E` (only for success/verified), Navy Ink `#141A3D`, Mist `#F3F5FB`
- Font: Plus Jakarta Sans (ExtraBold for the logo)
- Logo files in the website: `website/public/products/yuproof/` (`icon.png`, `wordmark.svg`, `wordmark-light.svg`)

## Website change (patch: `yuproof-website.patch`)
Repo: `Jithu797/YubhianNew` (Next.js 16 site in `website/`, admin SPA in `admin/`).
Apply from the repo root: `git am yuproof-website.patch`

What it does:
- Adds YuProof to `website/src/lib/products.ts`; copy lives in `website/src/lib/yuproof.ts`
- `/products/[slug]/ProductDetail.tsx`: section headings now come from `product.copy` (defaults = YuCampus wording, so YuCampus is unchanged); new `heroCard` (sample verification card) when a product has no screenshot yet
- `ProductLeadForm`: `orgLabel` and `defaultIntent` props
- New lead source `yuproof-pilot`: `api/notify-lead`, `firestore.rules`, admin `LeadsInbox.tsx` and `ProjectsManager.tsx`
- Footer link, sitemap generated from `PRODUCTS`, `/yuproof` redirect, and a host redirect from `yuproof.yubhiantechnologies.in` to `/products/yuproof`

After merging:
1. Publish the updated `website/firestore.rules` in Firebase (otherwise pilot requests aren't saved)
2. Add `yuproof.yubhiantechnologies.in` to the website's Vercel project and create the CNAME at the registrar

Checked: `tsc --noEmit` and eslint pass; pages render on desktop and mobile in `next dev`. Production build not run in the sandbox (Google Fonts blocked there).

## Planned tech stack (for the product itself)
- Smart contracts: Solidity + Hardhat, Polygon (Amoy test network first)
- Backend: Node.js + Express + ethers.js; PostgreSQL or MongoDB for off-chain data
- Frontend: React (issuer portal, holder wallet, verifier page, admin)
- Credentials: W3C Verifiable Credentials format; QR via `qrcode`
- Everything on free tiers during the MVP

Core contract functions: `approveIssuer(address, category)`, `issue(hash, docType)`, `issueBatch(hashes[])` (or a Merkle root), `revoke(hash)` (original issuer only), `verify(hash)` returning valid, issuer, type and date.

## Plan and status
| Step | Status |
|---|---|
| 1. Brand and logo | Done |
| 2. Website: product page | Done (patch, needs merge) |
| 3. UI design: 35 screens for public verify, wallet, issuer portal, HR, admin, elections | Done (see `YUPROOF_SPEC.md` and `screens/`) |
| 4. Brochure, pitch deck, user manuals | After UI |
| 5. Build MVP: contract, backend, frontend, YuCampus link (8 weeks) | After UI |
| 6. Free pilot with 2 to 3 colleges (YuCampus customers first) | After MVP |

## UI design
- Final style: "A + B" (bold blue guilloche header + round seal + cream document card + serif headlines)
- Full screen list, design tokens, flows, data model, API and build order: `YUPROOF_SPEC.md`
- Visual reference: `screens/html/*.html` (open in a browser) and `screens/png/*.png`

## Rules to keep
- Never claim YuProof is live or has customers until it does
- Don't invent stats; mark sample data as sample
- Keep personal data off-chain
- Green means verified only
