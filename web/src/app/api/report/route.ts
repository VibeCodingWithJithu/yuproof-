import { db } from "@/lib/db";
import { guard, json } from "@/lib/http";
import { HASH_RE, normalizeDocId } from "@/lib/types";

/** POST /api/report — someone reports a suspicious or edited document. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const reason = typeof body?.reason === "string" ? body.reason.trim().slice(0, 2000) : "";
  if (!body || reason.length < 3) return json({ error: "bad_request", message: "Please describe the problem." }, 400);

  const docId = typeof body.documentId === "string" ? normalizeDocId(body.documentId) : null;
  const claimed = typeof body.claimedDocId === "string" ? normalizeDocId(body.claimedDocId) : null;
  const hash = typeof body.hash === "string" && HASH_RE.test(body.hash.toLowerCase()) ? body.hash.toLowerCase() : null;
  const contact = typeof body.contact === "string" ? body.contact.trim().slice(0, 200) || null : null;

  return guard(async () => {
    const conn = await db();
    const known = docId ? await conn.query(`SELECT 1 FROM documents WHERE id = $1`, [docId]) : [];
    await conn.query(
      `INSERT INTO reports (document_id, claimed_doc_id, hash, reason, contact) VALUES ($1, $2, $3, $4, $5)`,
      [known.length ? docId : null, claimed ?? (known.length ? null : docId), hash, reason, contact],
    );
    return json({ ok: true });
  });
}
