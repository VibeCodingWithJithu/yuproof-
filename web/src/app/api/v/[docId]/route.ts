import { guard, ipCountry, json } from "@/lib/http";
import { normalizeDocId } from "@/lib/types";
import { verifyDocId } from "@/lib/verify";

/** GET /api/v/:docId — status of a document by its ID (logged as an ID check). */
export async function GET(req: Request, ctx: RouteContext<"/api/v/[docId]">) {
  const { docId } = await ctx.params;
  const id = normalizeDocId(decodeURIComponent(docId));
  if (!id) return json({ result: "not_found", reason: "unknown_id", method: "id", checkedAt: new Date().toISOString() });
  return guard(async () => json(await verifyDocId(id, { method: "id", ipCountry: ipCountry(req) })));
}
