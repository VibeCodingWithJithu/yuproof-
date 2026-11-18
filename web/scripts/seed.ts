/**
 * Local demo data for milestone 2 (all marked as SAMPLE).
 *
 *   1. Deploys IssuerRegistry + DocumentRegistry to a local Hardhat node (chain 31337),
 *      or uses ISSUER_REGISTRY_ADDRESS / DOCUMENT_REGISTRY_ADDRESS + SEED_*_KEY on other chains.
 *   2. Approves two sample issuers, generates sample PDFs, records them (Merkle batch + single),
 *      cancels one with a replacement.
 *   3. Writes the database rows and web/samples/*.pdf (incl. a tampered copy and a never-issued file).
 *   4. Writes contract addresses to .env.local (local chain only).
 *
 * Run with the dev server stopped (embedded PGlite allows one process at a time):
 *   npm run seed
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
import { Contract, ContractFactory, JsonRpcProvider, Wallet, type Signer } from "ethers";
import { openDb } from "../src/lib/db-core";
import { samplePdf, type SampleDoc } from "./sample-pdf";

const RPC = process.env.CHAIN_RPC_URL ?? "http://127.0.0.1:8545";
const BASE = process.env.PUBLIC_BASE_URL ?? "http://localhost:3000";
const OUT = join(process.cwd(), "samples");
const ARTIFACTS = join(process.cwd(), "../contracts/artifacts/contracts");

const DOC_TYPE = { degree: 1, marksheet: 2, tc: 3, course: 4, internship: 5, experience: 6, other: 9 } as const;
type DocTypeKey = keyof typeof DOC_TYPE;

const sha256 = (b: Uint8Array) => "0x" + createHash("sha256").update(b).digest("hex");
const artifact = (name: string) => JSON.parse(readFileSync(join(ARTIFACTS, `${name}.sol/${name}.json`), "utf8"));

async function main() {
  const provider = new JsonRpcProvider(RPC);
  const { chainId } = await provider.getNetwork().catch(() => {
    throw new Error(`Can't reach ${RPC}. Start the local chain first: (cd ../contracts && npm run node)`);
  });
  const local = chainId === 31337n;
  console.log(`Chain ${chainId} at ${RPC}`);

  let admin: Signer, college: Signer, company: Signer;
  let issuerRegistry: Contract, documentRegistry: Contract;
  if (local) {
    [admin, college, company] = await Promise.all([0, 1, 2].map((i) => provider.getSigner(i)));
    const IR = artifact("IssuerRegistry");
    const DR = artifact("DocumentRegistry");
    issuerRegistry = (await (await new ContractFactory(IR.abi, IR.bytecode, admin).deploy(await admin.getAddress())).waitForDeployment()) as Contract;
    documentRegistry = (await (await new ContractFactory(DR.abi, DR.bytecode, admin).deploy(await issuerRegistry.getAddress())).waitForDeployment()) as Contract;
  } else {
    const need = ["ISSUER_REGISTRY_ADDRESS", "DOCUMENT_REGISTRY_ADDRESS", "SEED_ADMIN_KEY", "SEED_ISSUER_KEY"];
    const missing = need.filter((k) => !process.env[k]);
    if (missing.length) throw new Error(`Non-local chain: set ${missing.join(", ")}`);
    admin = new Wallet(process.env.SEED_ADMIN_KEY!, provider);
    college = new Wallet(process.env.SEED_ISSUER_KEY!, provider);
    company = process.env.SEED_COMPANY_KEY ? new Wallet(process.env.SEED_COMPANY_KEY, provider) : college;
    issuerRegistry = new Contract(process.env.ISSUER_REGISTRY_ADDRESS!, artifact("IssuerRegistry").abi, admin);
    documentRegistry = new Contract(process.env.DOCUMENT_REGISTRY_ADDRESS!, artifact("DocumentRegistry").abi, admin);
  }
  const irAddr = await issuerRegistry.getAddress();
  const drAddr = await documentRegistry.getAddress();
  console.log(`IssuerRegistry   ${irAddr}\nDocumentRegistry ${drAddr}`);

  // ---- Issuers on chain
  const collegeAddr = await college.getAddress();
  const companyAddr = await company.getAddress();
  const ir = issuerRegistry.connect(admin) as Contract;
  for (const [addr, name, cat] of [
    [collegeAddr, "Sample College of Engineering", 1],
    [companyAddr, "Sample Tech Pvt Ltd", 2],
  ] as const) {
    if (!(await ir.isApproved(addr))) await (await ir.approveIssuer(addr, name, cat)).wait();
  }

  // ---- Sample PDFs
  mkdirSync(OUT, { recursive: true });
  const docs: (SampleDoc & { id: string; key: string; type: DocTypeKey; issuerId: string; email?: string })[] = [
    { key: "genuine-degree", id: "YP-2026-004213", type: "degree", issuerId: "sample-college", issuer: "Sample College of Engineering", title: "B.Tech degree, Computer Science", holder: "Ananya Rao", lines: ["has been awarded the degree of Bachelor of Technology", "in Computer Science and Engineering, First Class with Distinction"], issuedOn: "12 Jun 2026" },
    { key: "cancelled-tc", id: "YP-2026-004214", type: "tc", issuerId: "sample-college", issuer: "Sample College of Engineering", title: "Transfer certificate", holder: "Rahul Verma", lines: ["Date of leaving: 30 Apr 2026 (wrong date, sample)"], issuedOn: "20 May 2026" },
    { key: "genuine-marksheet", id: "YP-2026-004215", type: "marksheet", issuerId: "sample-college", issuer: "Sample College of Engineering", title: "Semester 8 mark sheet", holder: "Ananya Rao", lines: ["SGPA 7.8  ·  Result: Pass"], issuedOn: "12 Jun 2026" },
    { key: "genuine-degree-2", id: "YP-2026-004216", type: "degree", issuerId: "sample-college", issuer: "Sample College of Engineering", title: "B.Tech degree, Mechanical Engineering", holder: "Kiran Kumar", lines: ["has been awarded the degree of Bachelor of Technology", "in Mechanical Engineering, First Class"], issuedOn: "12 Jun 2026" },
  ];
  const replacement = { key: "replacement-tc", id: "YP-2026-004530", type: "tc" as DocTypeKey, issuerId: "sample-college", issuer: "Sample College of Engineering", title: "Transfer certificate", holder: "Rahul Verma", lines: ["Date of leaving: 31 May 2026 (corrected, sample)"], issuedOn: "3 Jun 2026" };
  const internship = { key: "genuine-internship", id: "YP-2026-004601", type: "internship" as DocTypeKey, issuerId: "sample-company", issuer: "Sample Tech Pvt Ltd", title: "Internship letter", holder: "Priya Shah", lines: ["completed a 12-week internship as Software Engineering Intern"], issuedOn: "1 Aug 2026" };

  const bytes = new Map<string, Uint8Array>();
  for (const d of [...docs, replacement, internship]) {
    const b = await samplePdf(d, BASE);
    bytes.set(d.id, b);
    writeFileSync(join(OUT, `${d.key}-${d.id}.pdf`), b);
  }
  // A copy of the mark sheet with the SGPA changed: same ID, different fingerprint.
  writeFileSync(
    join(OUT, "tampered-marksheet-YP-2026-004215.pdf"),
    await samplePdf({ ...docs[2], lines: ["SGPA 9.8  ·  Result: Pass"] }, BASE),
  );
  // A lookalike document that was never issued on YuProof (no ID).
  writeFileSync(
    join(OUT, "not-issued.pdf"),
    await samplePdf({ id: null, issuer: "Sample Fake University", title: "Degree certificate", holder: "Unknown Person", lines: ["(never issued on YuProof)"], issuedOn: "1 Jan 2026" }, BASE),
  );

  // ---- Record on chain: batch of 4 (Merkle root) + 2 single issues
  const hashOf = (id: string) => sha256(bytes.get(id)!);
  const tree = StandardMerkleTree.of(docs.map((d) => [hashOf(d.id)]), ["bytes32"]);
  const drCollege = documentRegistry.connect(college) as Contract;
  const drCompany = documentRegistry.connect(company) as Contract;

  const batchTx = await drCollege.issueBatch(tree.root, docs.length);
  const batchRcpt = await batchTx.wait();
  const ev = batchRcpt.logs.map((l: { topics: string[]; data: string }) => drCollege.interface.parseLog(l)).find((p: { name: string } | null) => p?.name === "BatchIssued");
  const chainBatchId = Number(ev!.args.batchId);

  const repTx = await (await drCollege.issue(hashOf(replacement.id), DOC_TYPE.tc)).wait();
  const intTx = await (await drCompany.issue(hashOf(internship.id), DOC_TYPE.internship)).wait();

  const cancelled = docs[1];
  const proofOf = (id: string) => tree.getProof([hashOf(id)]);
  await (await drCollege.revokeInBatch(chainBatchId, hashOf(cancelled.id), proofOf(cancelled.id), hashOf(replacement.id))).wait();
  console.log(`Recorded batch #${chainBatchId} (${docs.length} docs), 2 single documents, 1 cancellation`);

  // ---- Database
  const conn = await openDb(process.env.DATABASE_URL, process.env.PGLITE_DIR ?? ".data/pglite");
  await conn.query(`DELETE FROM checks WHERE document_id IN (SELECT id FROM documents WHERE is_sample)`);
  await conn.query(`DELETE FROM reports WHERE document_id IN (SELECT id FROM documents WHERE is_sample)`);
  await conn.query(`DELETE FROM share_links WHERE document_id IN (SELECT id FROM documents WHERE is_sample)`);
  await conn.query(`UPDATE documents SET replacement_id = NULL WHERE is_sample`);
  await conn.query(`DELETE FROM documents WHERE is_sample`);
  await conn.query(`DELETE FROM batches WHERE issuer_id IN (SELECT id FROM issuers WHERE is_sample)`);
  await conn.query(`DELETE FROM issuers WHERE is_sample`);
  await conn.query(`DELETE FROM watchlist WHERE source = 'sample'`);

  await conn.query(
    `INSERT INTO issuers (id, name, type, aishe_code, email_domain, contact_email, location, wallet_address, status, approved_at, is_sample) VALUES
     ('sample-college', 'Sample College of Engineering', 'college', 'C-00000', 'sample-college.example', 'registrar@sample-college.example', 'Sample City', $1, 'approved', now(), true),
     ('sample-company', 'Sample Tech Pvt Ltd', 'company', NULL, 'sampletech.example', 'hr@sampletech.example', 'Sample City', $2, 'approved', now(), true)`,
    [collegeAddr, companyAddr],
  );
  await conn.query(
    `INSERT INTO batches (id, issuer_id, doc_type, status, count, merkle_root, chain_batch_id, tx_hash, block, recorded_at)
     VALUES ('sample-batch-1', 'sample-college', 'mixed', 'recorded', $1, $2, $3, $4, $5, now())`,
    [docs.length, tree.root, chainBatchId, batchRcpt.hash, batchRcpt.blockNumber],
  );
  const insertDoc = (d: (typeof docs)[number], extra: { batch?: boolean; tx?: string }) =>
    conn.query(
      `INSERT INTO documents (id, batch_id, issuer_id, doc_type, title, holder_name, email, hash, merkle_proof, tx_hash, issued_at, is_sample)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true)`,
      [d.id, extra.batch ? "sample-batch-1" : null, d.issuerId, d.type, d.title, d.holder, d.email ?? null, hashOf(d.id), extra.batch ? JSON.stringify(proofOf(d.id)) : null, extra.tx ?? null, new Date(d.issuedOn + " 10:00 UTC")],
    );
  for (const d of docs) await insertDoc(d, { batch: true });
  await insertDoc(replacement, { tx: repTx.hash });
  await insertDoc(internship, { tx: intTx.hash });
  await conn.query(
    `UPDATE documents SET status = 'cancelled', cancelled_at = '2026-06-03T10:00:00Z',
       cancel_reason = 'Issued with a wrong date of leaving. A corrected certificate was issued.', replacement_id = $2
     WHERE id = $1`,
    [cancelled.id, replacement.id],
  );
  await conn.query(
    `INSERT INTO share_links (code, document_id, recipient, expires_at, created_at) VALUES ('demo-share-ananya', 'YP-2026-004213', 'Sample Employer', now() + interval '30 days', '2026-11-15T09:00:00Z')`,
  );
  await conn.query(
    `INSERT INTO watchlist (name, location, source, evidence, status) VALUES ('Sample Fake University', 'Nowhere', 'sample', 'Sample entry for testing', 'blocked')`,
  );
  await conn.close();

  // ---- .env.local (local chain only)
  if (local) {
    const envPath = join(process.cwd(), ".env.local");
    const keep = existsSync(envPath)
      ? readFileSync(envPath, "utf8").split(/\r?\n/).filter((l) => l && !/^(CHAIN_RPC_URL|CHAIN_NAME|ISSUER_REGISTRY_ADDRESS|DOCUMENT_REGISTRY_ADDRESS|PUBLIC_BASE_URL)=/.test(l))
      : [];
    writeFileSync(
      envPath,
      [...keep, `CHAIN_RPC_URL=${RPC}`, "CHAIN_NAME=Local Hardhat", `ISSUER_REGISTRY_ADDRESS=${irAddr}`, `DOCUMENT_REGISTRY_ADDRESS=${drAddr}`, `PUBLIC_BASE_URL=${BASE}`].join("\n") + "\n",
    );
    console.log("Wrote .env.local");
  }

  console.log(`\nSample PDFs in ${OUT}:`);
  console.log("  genuine-*.pdf          -> Genuine");
  console.log("  cancelled-tc-*.pdf     -> Cancelled (replacement YP-2026-004530)");
  console.log("  tampered-*.pdf         -> Doesn't match");
  console.log("  not-issued.pdf         -> Not found");
  console.log(`Try: ${BASE}/v/YP-2026-004213  ·  ${BASE}/s/demo-share-ananya  ·  ${BASE}/v/YP-2026-004214`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
