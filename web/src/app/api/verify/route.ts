import { guard, ipCountry, json } from "@/lib/http";
import { HASH_RE, normalizeDocId, type CheckMethod } from "@/lib/types";
import { verifyDocId, verifyHash, verifyShareCode } from "@/lib/verify";

const METHODS: CheckMethod[] = ["qr", "id", "upload", "link", "api"];

/**
 * POST /api/verify
 * { hash, claimedDocId? }  — uploaded file (hash computed in the browser)
 * { docId, method? }       — QR code or typed ID
 * { shareCode }            — wallet share link
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return json({ error: "bad_request", message: "Send a JSON body." }, 400);
  const ctx = { ipCountry: ipCountry(req) };

  return guard(async () => {
    if (typeof body.hash === "string") {
      const hash = body.hash.toLowerCase();
      if (!HASH_RE.test(hash)) return json({ error: "bad_request", message: "hash must be 0x + 64 hex chars" }, 400);
      const claimed = typeof body.claimedDocId === "string" ? normalizeDocId(body.claimedDocId) : null;
      return json(await verifyHash(hash, claimed, { ...ctx, method: "upload" }));
    }
    if (typeof body.docId === "string") {
      const id = normalizeDocId(body.docId);
      const method = METHODS.includes(body.method as CheckMethod) ? (body.method as CheckMethod) : "id";
      if (!id) return json({ result: "not_found", reason: "unknown_id", method, checkedAt: new Date().toISOString() });
      return json(await verifyDocId(id, { ...ctx, method }));
    }
    if (typeof body.shareCode === "string" && /^[A-Za-z0-9_-]{6,64}$/.test(body.shareCode)) {
      return json(await verifyShareCode(body.shareCode, { ...ctx, method: "link" }));
    }
    return json({ error: "bad_request", message: "Send hash, docId or shareCode." }, 400);
  });
}
