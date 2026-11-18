# YuProof: product and UI specification for Claude Code

YuProof (by Yubhian Technologies LLP) lets approved issuers put a tamper-proof fingerprint of each document on a public blockchain, and lets anyone verify a document in seconds. This file is the single source of truth for building it. Read `YUPROOF_CONTEXT.md` first for background.

**What's in this package**

| Folder / file | What it is |
|---|---|
| `YUPROOF_SPEC.md` | This spec: design system, every screen, flows, data model, API, contracts, build order |
| `YUPROOF_CONTEXT.md` | Project background, brand, decisions, status |
| `screens/png/` | Screenshot of every screen, named `<area>--<Screen>.png` |
| `screens/html/` | Every screen as a standalone HTML file (open in a browser; links between screens work). Use these as the exact visual reference: copy colours, spacing, sizes and copy from them |
| `brand/` | Logo files (SVG and PNG) |

All names, colleges, numbers and hashes on the screens are **sample data**. Never ship them as real content.

---

## 1. Design system

### Colours

| Token | Hex | Use |
|---|---|---|
| `blue` (Yu Blue) | `#2B3990` | Primary actions, headers, links, brand |
| `blue-soft` | `#E8EBF8` | Selected states, info chips, icon tiles |
| `blue-on-blue` | `#3E4DA6` | Pills and tiles on a blue header |
| `guilloche` | `#3A49A8` | Thin circle pattern in blue headers |
| `green` (Verified) | `#0E9F6E` | **Only** "verified / genuine / done". Never decoration |
| `green-bg` / `green-text` | `#E3F6EE` / `#065F46` | Success chips and banners |
| `red` | `#B42318` | **Only** "tampered / reject / destructive" |
| `red-bg` / `red-text` | `#FDECEC` / `#912018` | Error chips and banners |
| `red-header` | `#8E1B13` | Tampered result header |
| `amber` | `#B45309` | Cancelled by issuer, warnings |
| `amber-bg` / `amber-text` | `#FFF1D6` / `#7C4A03` | Warning chips, drafts |
| `amber-header` | `#8A4B08` | Cancelled result header |
| `grey-header` | `#3D4560` | Not-found result header |
| `navy` (Ink) | `#141A3D` | Body text, portal sidebar, dark panels |
| `muted` | `#4A5368` | Secondary text (passes 4.5:1 on white and mist) |
| `border` | `#E4E8F3`, inputs `#C9D0E3` | Hairlines, input borders |
| `mist` | `#F3F5FB` | App background |
| `cream` | `#FBF8F1` | Document cards (certificate paper look) |
| `strip` | repeating `#2B3990` / `#0E9F6E` / `#B8892E`, 18 px each | 6 px band on top of document cards |

### Typography
- **Fraunces 600** (serif): page titles, result headlines ("Genuine"), document names, student names on certificates.
- **Plus Jakarta Sans 400–800**: everything else.
- **JetBrains Mono 500/700**: hashes, transaction IDs, share links, API snippets, receipt codes.
- Sizes: phone title 26–38 px, desktop page title 34 px, body 14–15 px, small 12–13 px, labels 11 px uppercase with 0.08em tracking.

### Shape and spacing
- Radius: cards 18 px, buttons 14 px (small 10 px), inputs 12 px, chips full pill, phone header bottom corners 32–36 px.
- Buttons 48 px high (52–54 px for the main phone action); small buttons 38 px. Touch targets at least 44 px.
- Phone: 390 × 844, 16–20 px side padding. Desktop: fluid, sidebar 248 px, content padding 16–40 px, must reflow to phone width (sidebar stacks on top).

### Signature elements
1. **Seal**: a round stamp with text on a circle. Variants: green "VERIFIED · YUPROOF", white/red "NOT VERIFIED · DO NOT ACCEPT", white/amber "CANCELLED BY ISSUER", white/grey "NOT FOUND", green "VOTE RECORDED". Build it once as an SVG component with `variant` prop (see any result screen's HTML).
2. **Guilloche header**: coloured header with rounded bottom corners and thin concentric circles (1 px, slightly lighter than the header).
3. **Document card**: cream background, 6 px tricolour strip on top, serif document and person names, QR in the corner.
4. **Overlap**: on result screens the document card overlaps the header by 56 px with a soft shadow.
5. **Status chips**: Genuine (green), Tampered (red), Cancelled (amber), Not found / Draft / Cancelled-in-tables (grey or amber), Info (blue).

### Rules
- Colour always means the same thing: green = verified, red = tampered, amber = cancelled/warning, blue = action.
- Every screen works on phone width. Public verify and wallet are phone-first; portals are desktop-first but responsive.
- Real buttons, links, labels and inputs (accessible). Icon-only buttons need `aria-label`.
- Languages: English first; Hindi and Telugu planned (language switch on the public home).

### Recommended component list
`Button` (primary, secondary, danger, white, small), `Chip`, `Card`, `Field` (label + input/select/textarea), `Toggle`, `Segmented`, `Stepper`, `Seal`, `GuillocheHeader`, `DocumentCard`, `QRCode`, `KpiCard`, `DataTable`, `UploadDropzone`, `PortalLayout` (sidebar + search + account), `PhoneTopBar`, `BottomActionBar`, `WalletTabBar`, `Timeline`.

---

## 2. Apps and routes

Recommended: one Next.js (App Router, TypeScript, Tailwind) app with route groups, plus a `contracts` package (Hardhat). This matches the Yubhian website stack. Adjust if you have a reason to.

| App | Users | Base route | Auth |
|---|---|---|---|
| Public verification | Anyone | `/` and `/v/[docId]`, `/s/[shareCode]` | None |
| Wallet | Students, employees | `/wallet` | Phone OTP or email OTP |
| Issuer portal | Colleges, institutes, companies | `/issuer` | Email + password + OTP; roles |
| Verifier portal | HR teams, background-check firms | `/verifier` | Email + password |
| Admin | Yubhian staff | `/admin` | Email + OTP, internal only |
| Elections (phase 2) | Verified students | `/vote/[electionId]` | Wallet login |

---

## 3. Screens

Each row: screen file (in `screens/html/` and `screens/png/`), suggested route, what it does, and what it links to.

### 3.1 Public verification (phone-first)

| Screen | Route | Purpose and key elements | Actions |
|---|---|---|---|
| `Main` | `/` | Home: "Is this certificate real?", Scan QR, Upload PDF, enter document ID, how it works (3 steps), no-login and privacy notes, language switch, link for issuers | Scan → `VerifyScan`; Upload → `VerifyChecking`; ID → checking |
| `VerifyScan` | `/scan` | Full-screen camera with frame and scan line; upload instead | Auto-detect QR → checking |
| `VerifyChecking` | `/check` | Progress ring + 4 steps: read file, calculate fingerprint, compare with blockchain, check issuer | → one of 4 results |
| `Final-Genuine` | `/v/[docId]` | Blue header, green seal, "Genuine", 3 check chips, document card (holder, document, verified issuer, date, ID), document journey timeline, fingerprint | View document, Download proof (PDF verification report), New check |
| `Final-Tampered` | result | Red header, red seal, "Doesn't match", "File edited" highlighted, what it claims to be, explanation, 2 next steps, issuer notified note | Contact college, Report document |
| `VerifyCancelled` | result | Amber header, cancelled seal, cancel date, issuer's reason, link to replacement document | Check replacement |
| `VerifyNotFound` | result | Grey header, "Not found", three possible meanings, search whether an issuer uses YuProof | Try another file, Report as suspicious |

### 3.2 Student wallet (phone)

| Screen | Route | Purpose and key elements | Actions |
|---|---|---|---|
| `WalletLogin` | `/wallet/login` | Mobile number (+91), Send OTP, continue with email, privacy note | → `WalletOTP` |
| `WalletOTP` | `/wallet/verify` | 6-digit OTP, resend timer; after success: "we found N documents" with checkboxes to claim (matched on phone/email given by the issuer) | Add documents → `WalletHome` |
| `WalletHome` | `/wallet` | Blue header with count, stats (shared links, checks this month, problems), search, category filters, document list (mini cream thumbnail, issuer, date, Verified chip), tab bar | Open document |
| `WalletDetail` | `/wallet/d/[docId]` | Full document card, verified line, Share / Show QR / Download, details list, "Checked N times" | Share → `WalletShare`; checks → `WalletActivity` |
| `WalletShare` | `/wallet/share/[docId]` | Recipient (optional), expiry (7 / 30 days / no limit), toggles (show marks, allow download), generated link with Copy, WhatsApp, Email, QR; active links with Stop | Create, copy, revoke links |
| `WalletCV` | `/wallet/cv` | Verified CV: each line marked Verified (from an issued document) or Self-declared | Share CV link, Download PDF, Edit |
| `WalletActivity` | `/wallet/activity` | Alert if an edited copy of their document was checked; list of every check (who, document, how, when, result); notify toggle | Report |

Tab bar: Documents, Shared, Activity, My CV.

### 3.3 Issuer portal (desktop, responsive)

Sidebar: Dashboard, Issue documents, Documents, Templates, Verifications, Team, YuCampus & API. Footer card: institution name, role, "Verified issuer" chip. Top: global search (name, roll number, document ID), notifications, account.

| Screen | Route | Purpose and key elements | Actions |
|---|---|---|---|
| `CollegeSignup` | `/issuer/signup` | 4-step KYC: institution details, documents (affiliation letter, registration certificate, authorisation letter), authorised signatory, review. AISHE code, official email domain. Side panel: what we check; reuse YuCampus details | Back, Continue |
| `CollegeReview` | `/issuer/status` | Application timeline (submitted, documents checked, video call with signatory, approved and recorded on chain); while-you-wait shortcuts | Reschedule call, view application |
| `CollegeDashboard` | `/issuer` | Tampered-copy alert banner, 4 KPIs, verifications-by-month bar chart, quick actions, recent batches table, recent verifications list | Issue documents, Import from YuCampus |
| `IssueUpload` | `/issuer/issue` (step 1) | Stepper; document type cards (degree, mark sheet, TC, course, internship, other); template select; Excel/CSV dropzone with sample download; import from YuCampus; batch summary | Save draft, Continue |
| `IssueCheck` | step 2 | KPIs (rows, ready, need fixing, please confirm); filter chips; editable table with row-level errors (missing mobile, duplicate roll no., differs from YuCampus) | Upload fixed file, Skip bad rows, Continue |
| `IssuePreview` | step 3 | Certificate preview with pager (1 of N); signing panel: signatory, what happens next, confirmation checkbox, signatory OTP | Sign and issue N documents |
| `IssueDone` | step 4 | Blue celebration header with seal; blockchain record (network, tx, block, Merkle root, time) with explorer link; next steps (students notified, download ZIP, view batch) | Issue another batch |
| `TemplateDesigner` | `/issuer/templates/[id]` | Field palette (name, programme, result, date, QR, document ID, signature, logo), canvas with certificate, properties (font, size, colour, align, Excel column) | Preview with real data, Save |
| `CollegeDocuments` | `/issuer/documents` | Filters (type, batch, status, year), table (student, roll no., document, issued, status, checks, ID), pagination | Export, Re-send to students, open detail |
| `CollegeDocDetail` | `/issuer/documents/[docId]` | Document preview, download/re-send/copy link, who-checked table, blockchain record, **Cancel this document** panel (reason, link corrected replacement, irreversible warning) | Cancel document |
| `CollegeTeam` | `/issuer/team` | Members table with roles; role descriptions; approval rules (signatory approval, two signatories for degrees, only admins cancel) | Invite member |
| `CollegeIntegrations` | `/issuer/integrations` | YuCampus connection (status, last sync, auto-import toggles), API keys, webhooks, other connections (Excel, Google sign-in, DigiLocker planned) | New key, revoke |

Roles: **Admin** (team, templates, settings), **Issuer** (prepares batches), **Signatory** (approves and signs with OTP), **Viewer** (read only).

### 3.4 Verifier portal (HR)

Sidebar: Check documents, Reports, History, Plan & billing, API access.

| Screen | Route | Purpose and key elements | Actions |
|---|---|---|---|
| `HRBulkCheck` | `/verifier` | Dropzone (up to 200 PDFs, ZIP, Excel of links), paste share links, tag; live queue with per-file result; plan card | Choose files, View report |
| `HRReport` | `/verifier/reports/[id]` | 5 KPIs (checked, genuine, tampered, cancelled, not found), alert for tampered, results table by candidate with filters | Excel and PDF export, open candidate |
| `HRHistory` | `/verifier/history` | Past checks table; plan and billing (pilot free; price placeholder); API access snippet `POST /v1/verify` | New check, create API key |

### 3.5 Admin (internal)

| Screen | Route | Purpose and key elements | Actions |
|---|---|---|---|
| `AdminOverview` | `/admin` | KPIs (issuers, waiting approval, documents on chain, checks today, tampered this month); blockchain and system health (network, contract, fee wallet balance, last batch, uptime, data region); alerts | — |
| `AdminApprovals` | `/admin/issuers` | Queue of applications; detail with automated checks (AISHE, AICTE, UGC fake list, email domain), pending manual checks (video call, signature), documents, note | Ask for more, Reject, **Approve and record on chain** |
| `AdminWatchlist` | `/admin/watchlist` | Flagged institutions (source: UGC fake list, employer reports, look-alike names), import UGC list, add entry | Block / review |

### 3.6 Campus elections (phase 2, phone)

| Screen | Route | Purpose | Actions |
|---|---|---|---|
| `VoteBallot` | `/vote/[id]` | Election header, verified voter chip, closing timer, position N of M, candidate radio cards, secrecy note | Next position / Submit |
| `VoteReceipt` | `/vote/[id]/done` | Vote-recorded seal, receipt code (proves counted, not choice), guarantees | Save receipt, live turnout |
| `VoteResults` | `/vote/[id]/results` | Turnout ring, results bars per position, result transaction, audit link | Check receipt, audit |

---

## 4. Core logic

### Verification
1. Each issued PDF embeds a QR code linking to `https://<domain>/v/<docId>` (and the document ID is printed).
2. On issue: `hash = SHA-256(final PDF bytes)`. Store `docId → hash` off-chain; record the hash on-chain (single or in a batch Merkle tree).
3. Verify by **QR / ID / share link**: load the record, check on-chain status → Genuine or Cancelled.
4. Verify by **upload**: compute SHA-256 of the uploaded file **in the browser** (file never leaves the device).
   - Hash matches a record → Genuine (or Cancelled if revoked).
   - Hash doesn't match, but a document ID was read from the PDF's QR/text → **Tampered** (notify issuer and holder).
   - No match and no ID → **Not found**.
5. Also check the issuer is approved and not on the warning list.
6. Every check is logged (who if logged in, how, when, result) for the issuer dashboard, wallet activity and HR reports.

### Batch issuing
- Build a Merkle tree of the batch's hashes; record only the root on-chain in one transaction (cheap). Store each document's Merkle proof off-chain so verification can prove inclusion.
- Batch states: `draft → checked → signed → recording → recorded` (or `failed`, retry).

### Cancel
- Issuer admin cancels with reason and optional replacement doc ID; record revocation on-chain; results then show "Cancelled by issuer".

### Wallet claiming
- Issuer data includes mobile and email per student. After OTP login, documents with that verified phone/email are offered to claim.

### Share links
- Random code, expiry, options (show marks, allow download), revocable, open counter. A share link opens the Genuine result for that document only.

### Privacy
- Only hashes and Merkle roots go on-chain. Personal data stays in the database (India region), encrypted at rest. Uploaded files for verification are hashed client-side and not stored.

---

## 5. Smart contracts (Solidity, Hardhat, Polygon Amoy first)

`IssuerRegistry`
- `approveIssuer(address issuer, string name, uint8 category)` (admin only), `suspendIssuer(address)`, `isApproved(address) view`.

`DocumentRegistry`
- `issue(bytes32 hash, uint8 docType)` (approved issuers)
- `issueBatch(bytes32 merkleRoot, uint32 count)` returns `batchId`
- `revoke(bytes32 hash, bytes32 replacementHash)` (original issuer only)
- `verify(bytes32 hash) view` → `(bool exists, bool revoked, address issuer, uint64 issuedAt)`
- `verifyInBatch(uint256 batchId, bytes32 hash, bytes32[] proof) view` → same
- Events: `Issued`, `BatchIssued`, `Revoked`, `IssuerApproved`.

`Election` (phase 2)
- Register eligible voter commitments, one vote per voter, store commitment of vote, publish tally hash; receipt = voter's commitment.

Write full tests for every function, including revert cases (unapproved issuer, double issue, revoke by non-issuer).

---

## 6. Data model (PostgreSQL)

`issuers` (id, name, type, aishe_code, email_domain, wallet_address, status: applied/approved/suspended/rejected, approved_at)
`issuer_applications` (id, issuer_id, documents[], checks JSON, call_at, notes, decided_by, decided_at)
`users` (id, name, email, phone, role, issuer_id null, verifier_org_id null)
`templates` (id, issuer_id, name, doc_type, layout JSON, version)
`batches` (id, issuer_id, template_id, doc_type, status, count, merkle_root, tx_hash, block, signed_by, recorded_at)
`documents` (id = YP-YYYY-NNNNNN, batch_id, issuer_id, holder_name, roll_no, phone, email, data JSON, pdf_url, hash, merkle_proof, status: issued/cancelled, cancel_reason, replacement_id)
`wallet_holders` (id, phone, email, name) and `wallet_documents` (holder_id, document_id, claimed_at)
`share_links` (code, document_id, holder_id, recipient, expires_at, show_marks, allow_download, opens, revoked_at)
`checks` (id, document_id null, method: qr/id/upload/link/api/bulk, result: genuine/tampered/cancelled/not_found, verifier_org_id null, hr_batch_id null, ip_country, created_at)
`verifier_orgs`, `hr_batches` (id, org_id, tag, count, created_by)
`watchlist` (id, name, location, source, evidence, status)
`api_keys` (id, owner_type, owner_id, prefix, hash, created_at, revoked_at), `webhooks`
`elections`, `ballots`, `vote_commitments` (phase 2)

---

## 7. API (REST, JSON)

Public: `POST /api/verify` (hash or docId or share code) · `GET /api/v/:docId` · `GET /api/s/:code` · `POST /api/report`
Wallet: `POST /api/wallet/otp` · `POST /api/wallet/otp/verify` · `GET /api/wallet/documents` · `POST /api/wallet/claim` · `POST/DELETE /api/wallet/share` · `GET /api/wallet/activity` · `GET/PUT /api/wallet/cv`
Issuer: `POST /api/issuer/apply` · `GET/POST /api/issuer/batches` · `POST /api/issuer/batches/:id/upload` · `POST /api/issuer/batches/:id/validate` · `POST /api/issuer/batches/:id/sign` (OTP) · `GET /api/issuer/documents` · `POST /api/issuer/documents/:id/cancel` · `GET/PUT /api/issuer/templates` · `GET/POST /api/issuer/team` · `POST /api/issuer/yucampus/import`
Verifier: `POST /api/verifier/bulk` · `GET /api/verifier/reports/:id` · `GET /api/verifier/history`
Admin: `GET /api/admin/overview` · `GET /api/admin/applications` · `POST /api/admin/applications/:id/approve|reject` · `GET/POST /api/admin/watchlist`
External API (keys): `POST /v1/verify`, `POST /v1/issue` (issuers), webhooks `document.checked`, `document.tampered`.

---

## 8. Build order

| Milestone | Build | Screens |
|---|---|---|
| 1. Contracts | `IssuerRegistry`, `DocumentRegistry`, tests, deploy to Amoy | — |
| 2. Verify | Hashing, verify API, public pages, PDF verification report | Main, VerifyScan, VerifyChecking, 4 results |
| 3. Issue | Issuer auth and roles, Excel upload and validation, PDF generation with QR, batch Merkle recording, documents list, cancel | IssueUpload → IssueDone, CollegeDocuments, CollegeDocDetail, CollegeDashboard |
| 4. Onboarding | Issuer KYC application and admin approval (records issuer on chain), watchlist | CollegeSignup, CollegeReview, AdminApprovals, AdminWatchlist, AdminOverview |
| 5. Wallet | OTP login, claim, documents, share links, activity, CV | Wallet* |
| 6. HR | Bulk check, reports, history, API keys | HR* |
| 7. Extras | Template designer, team, YuCampus import, webhooks | TemplateDesigner, CollegeTeam, CollegeIntegrations |
| 8. Elections (phase 2) | Election contract and screens | Vote* |

Each milestone: build to match the screens in `screens/html`, write tests, run the app, compare against `screens/png`.

---

## 9. Open decisions (ask before building these)

- OTP and SMS provider (e.g. MSG91, Twilio) and email provider.
- Hosting and database (free tiers during pilot: Vercel + Supabase/Neon) and the India data-region requirement.
- Pricing for issuers and verifiers (shown as a placeholder).
- Fee wallet management for blockchain transactions (who holds the key; use a secure key store, never commit keys).
- Final domain (e.g. `yuproof.yubhiantechnologies.in` or a separate domain).
