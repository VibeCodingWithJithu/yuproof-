import "server-only";
import { chainIssuerApproved, chainVerify } from "./chain";
import { config } from "./config";
import { db } from "./db";
import type { CheckMethod, JourneyStep, ResultKind, VerifyResponse } from "./types";

interface DocRow {
  id: string;
  issuer_id: string;
  title: string;
  holder_name: string;
  hash: string;
  merkle_proof: string[] | null;
  tx_hash: string | null;
  status: "issued" | "cancelled";
  cancel_reason: string | null;
  cancelled_at: Date | null;
  replacement_id: string | null;
  issued_at: Date;
  is_sample: boolean;
  issuer_name: string;
  issuer_type: string;
  issuer_status: string;
  issuer_wallet: string | null;
  issuer_email: string | null;
  batch_id: string | null;
  batch_status: string | null;
  chain_batch_id: string | number | null;
  merkle_root: string | null;
  batch_tx: string | null;
  batch_block: string | number | null;
}

export interface CheckContext {
  method: CheckMethod;
  ipCountry?: string | null;
  /** Set to false to skip writing to the check log (e.g. downloading a proof PDF). */
  log?: boolean;
  share?: { createdAt: Date; holderFirstName?: string | null };
}

const DOC_SELECT = `
  SELECT d.id, d.issuer_id, d.title, d.holder_name, d.hash, d.merkle_proof, d.tx_hash, d.status,
         d.cancel_reason, d.cancelled_at, d.replacement_id, d.issued_at, d.is_sample,
         i.name AS issuer_name, i.type AS issuer_type, i.status AS issuer_status,
         i.wallet_address AS issuer_wallet, i.contact_email AS issuer_email,
         b.id AS batch_id, b.status AS batch_status, b.chain_batch_id, b.merkle_root,
         b.tx_hash AS batch_tx, b.block AS batch_block
    FROM documents d
    JOIN issuers i ON i.id = d.issuer_id
    LEFT JOIN batches b ON b.id = d.batch_id`;

async function findDoc(where: "d.id" | "d.hash", value: string): Promise<DocRow | null> {
  const rows = await (await db()).query<DocRow>(`${DOC_SELECT} WHERE ${where} = $1`, [value]);
  return rows[0] ?? null;
}

async function isBlocked(issuerName: string): Promise<boolean> {
  const rows = await (await db()).query(
    `SELECT 1 FROM watchlist WHERE status = 'blocked' AND lower(name) = lower($1) LIMIT 1`,
    [issuerName],
  );
  return rows.length > 0;
}

async function logCheck(ctx: CheckContext, result: ResultKind, documentId: string | null) {
  if (ctx.log === false) return;
  await (await db()).query(`INSERT INTO checks (document_id, method, result, ip_country) VALUES ($1, $2, $3, $4)`, [
    documentId,
    ctx.method,
    result,
    ctx.ipCountry ?? null,
  ]);
}

const iso = (d: Date | string | null) => (d ? new Date(d).toISOString() : null);
const issuerWord = (type: string) => (type === "company" ? "company" : type === "institute" ? "institute" : "college");

/** Reads the on-chain status of a stored document and builds the public result. */
async function evaluate(
  row: DocRow,
  ctx: CheckContext,
  fileChecked: boolean,
): Promise<VerifyResponse & { result: "genuine" | "cancelled" | "not_found" }> {
  const now = new Date().toISOString();
  const base = { method: ctx.method, checkedAt: now, isSample: row.is_sample };

  const inBatch = row.batch_id !== null;
  if (inBatch && (row.batch_status !== "recorded" || row.chain_batch_id === null || !row.merkle_proof)) {
    return { ...base, result: "not_found", reason: "not_recorded" };
  }
  const st = await chainVerify(
    row.hash,
    inBatch ? { chainBatchId: row.chain_batch_id!, proof: row.merkle_proof! } : undefined,
  );
  if (!st.exists) return { ...base, result: "not_found", reason: "not_recorded" };

  const sameIssuer = !!row.issuer_wallet && st.issuer.toLowerCase() === row.issuer_wallet.toLowerCase();
  const [approved, blocked] = await Promise.all([chainIssuerApproved(st.issuer), isBlocked(row.issuer_name)]);
  const issuerOk = sameIssuer && approved && !blocked;
  const cancelled = st.revoked || row.status === "cancelled";

  const txHash = inBatch ? row.batch_tx : row.tx_hash;
  const journey: JourneyStep[] = [
    {
      kind: "issued",
      at: new Date(st.issuedAt * 1000).toISOString(),
      label: "Issued",
      text: `by the ${issuerWord(row.issuer_type)} and recorded on the blockchain`,
    },
  ];
  if (ctx.share) {
    journey.push({
      kind: "shared",
      at: ctx.share.createdAt.toISOString(),
      label: "Shared",
      text: `by ${ctx.share.holderFirstName ?? "the holder"} from their wallet`,
    });
  }
  if (cancelled) {
    journey.push({ kind: "cancelled", at: iso(row.cancelled_at) ?? now, label: "Cancelled", text: "by the issuer" });
  }
  journey.push({ kind: "checked", at: now, label: "Checked by you", text: "" });

  return {
    ...base,
    result: cancelled ? "cancelled" : "genuine",
    document: {
      id: row.id,
      title: row.title,
      holderName: row.holder_name,
      issuedAt: new Date(st.issuedAt * 1000).toISOString(),
      hash: row.hash,
    },
    issuer: {
      name: row.issuer_name,
      type: row.issuer_type,
      verified: issuerOk,
      status: blocked ? "blocked" : approved ? "approved" : "suspended",
      contactEmail: row.issuer_email,
    },
    chain: {
      network: config.chain.name,
      contract: config.chain.documentRegistry,
      txHash,
      txUrl: txHash && config.chain.explorerTxUrl ? config.chain.explorerTxUrl + txHash : null,
      block: row.batch_block !== null ? Number(row.batch_block) : null,
      batchId: row.chain_batch_id !== null ? Number(row.chain_batch_id) : null,
      merkleRoot: row.merkle_root,
    },
    checks: { issuer: issuerOk, unchanged: fileChecked ? true : null, notCancelled: !cancelled },
    cancel: cancelled
      ? { at: iso(row.cancelled_at), reason: row.cancel_reason, replacementId: row.replacement_id }
      : undefined,
    journey,
  };
}

/** QR code, typed document ID or proof download: looks up the record by its ID. */
export async function verifyDocId(docId: string, ctx: CheckContext): Promise<VerifyResponse> {
  const row = await findDoc("d.id", docId);
  if (!row) {
    await logCheck(ctx, "not_found", null);
    return { result: "not_found", reason: "unknown_id", method: ctx.method, checkedAt: new Date().toISOString() };
  }
  const res = await evaluate(row, ctx, false);
  await logCheck(ctx, res.result, row.id);
  return res;
}

/**
 * Uploaded file: `hash` is the SHA-256 computed in the browser (the file never leaves the device).
 * `claimedDocId` is the ID read from the PDF's text, if any.
 */
export async function verifyHash(hash: string, claimedDocId: string | null, ctx: CheckContext): Promise<VerifyResponse> {
  const match = await findDoc("d.hash", hash);
  if (match) {
    const res = await evaluate(match, ctx, true);
    await logCheck(ctx, res.result, match.id);
    return res;
  }

  const claimed = claimedDocId ? await findDoc("d.id", claimedDocId) : null;
  if (!claimed) {
    await logCheck(ctx, "not_found", null);
    return {
      result: "not_found",
      reason: claimedDocId ? "unknown_id" : "no_match",
      method: ctx.method,
      checkedAt: new Date().toISOString(),
    };
  }

  // The file names a real document, but its fingerprint differs: it was edited after issue.
  const original = await evaluate(claimed, { ...ctx, log: false }, false);
  await logCheck(ctx, "tampered", claimed.id);
  return {
    result: "tampered",
    method: ctx.method,
    checkedAt: new Date().toISOString(),
    isSample: claimed.is_sample,
    document: original.document ?? {
      id: claimed.id,
      title: claimed.title,
      holderName: claimed.holder_name,
      issuedAt: new Date(claimed.issued_at).toISOString(),
      hash: claimed.hash,
    },
    issuer: original.issuer ?? {
      name: claimed.issuer_name,
      type: claimed.issuer_type,
      verified: false,
      status: "suspended",
      contactEmail: claimed.issuer_email,
    },
    checks: {
      issuer: original.checks?.issuer ?? false,
      unchanged: false,
      notCancelled: original.result !== "cancelled",
    },
  };
}

interface ShareRow {
  document_id: string;
  expires_at: Date | null;
  revoked_at: Date | null;
  created_at: Date;
}

/** Share link from a holder's wallet: opens the result for that one document. */
export async function verifyShareCode(code: string, ctx: CheckContext): Promise<VerifyResponse> {
  const conn = await db();
  const [link] = await conn.query<ShareRow>(
    `SELECT document_id, expires_at, revoked_at, created_at FROM share_links WHERE code = $1`,
    [code],
  );
  const expired = link && (link.revoked_at || (link.expires_at && new Date(link.expires_at) < new Date()));
  if (!link || expired) {
    await logCheck(ctx, "not_found", null);
    return {
      result: "not_found",
      reason: link ? "share_expired" : "unknown_id",
      method: ctx.method,
      checkedAt: new Date().toISOString(),
    };
  }
  await conn.query(`UPDATE share_links SET opens = opens + 1 WHERE code = $1`, [code]);
  const row = await findDoc("d.id", link.document_id);
  if (!row) return verifyDocId(link.document_id, ctx);
  const res = await evaluate(row, {
    ...ctx,
    share: { createdAt: new Date(link.created_at), holderFirstName: row.holder_name.split(" ")[0] },
  }, false);
  await logCheck(ctx, res.result, row.id);
  return res;
}
