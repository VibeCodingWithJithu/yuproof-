// Types shared by the server (API) and the browser (result screens).

export type ResultKind = "genuine" | "tampered" | "cancelled" | "not_found";
export type CheckMethod = "qr" | "id" | "upload" | "link" | "api" | "bulk";

export interface PublicIssuer {
  name: string;
  /** college | institute | company */
  type: string;
  /** Approved on-chain and not blocked on the warning list */
  verified: boolean;
  status: "approved" | "suspended" | "blocked";
  contactEmail: string | null;
}

export interface PublicDocument {
  id: string;
  title: string;
  holderName: string;
  issuedAt: string;
  hash: string;
}

export interface ChainRecord {
  network: string;
  contract: string;
  txHash: string | null;
  txUrl: string | null;
  block: number | null;
  batchId: number | null;
  merkleRoot: string | null;
}

export interface JourneyStep {
  kind: "issued" | "shared" | "cancelled" | "checked";
  at: string;
  label: string;
  text: string;
}

export interface VerifyResponse {
  result: ResultKind;
  method: CheckMethod;
  checkedAt: string;
  /** For not_found: why. */
  reason?: "no_match" | "unknown_id" | "not_recorded" | "share_expired";
  document?: PublicDocument;
  issuer?: PublicIssuer;
  chain?: ChainRecord;
  checks?: {
    issuer: boolean;
    /** true = uploaded file matches the record; null = no file was checked (QR, ID, link) */
    unchanged: boolean | null;
    notCancelled: boolean;
  };
  cancel?: { at: string | null; reason: string | null; replacementId: string | null };
  journey?: JourneyStep[];
  isSample?: boolean;
}

export const DOC_ID_RE = /\bYP-\d{4}-\d{6}\b/;

export function normalizeDocId(input: string): string | null {
  const m = input.trim().toUpperCase().match(DOC_ID_RE);
  return m ? m[0] : null;
}

/** Pulls a document ID or share code out of a scanned QR payload (URL or bare ID). */
export function parseQrPayload(text: string): { docId?: string; shareCode?: string } | null {
  const t = text.trim();
  try {
    const u = new URL(t);
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts[0] === "v" && parts[1]) {
      const id = normalizeDocId(decodeURIComponent(parts[1]));
      return id ? { docId: id } : null;
    }
    if (parts[0] === "s" && parts[1] && /^[A-Za-z0-9_-]{6,64}$/.test(parts[1])) return { shareCode: parts[1] };
    return null;
  } catch {
    const id = normalizeDocId(t);
    return id ? { docId: id } : null;
  }
}

export const HASH_RE = /^0x[0-9a-f]{64}$/;
