import { config } from "@/lib/config";
import { guard, json } from "@/lib/http";
import { buildProofPdf } from "@/lib/proof-pdf";
import { normalizeDocId } from "@/lib/types";
import { verifyDocId } from "@/lib/verify";

/** GET /api/proof/:docId — PDF verification report ("Download proof"). */
export async function GET(_req: Request, ctx: RouteContext<"/api/proof/[docId]">) {
  const { docId } = await ctx.params;
  const id = normalizeDocId(decodeURIComponent(docId));
  if (!id) return json({ error: "not_found" }, 404);
  return guard(async () => {
    const r = await verifyDocId(id, { method: "id", log: false });
    if (r.result !== "genuine" && r.result !== "cancelled") return json({ error: "not_found" }, 404);
    const bytes = await buildProofPdf(r, `${config.publicBaseUrl}/v/${id}`);
    return new Response(Buffer.from(bytes), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="YuProof-verification-${id}.pdf"`,
        "cache-control": "no-store",
      },
    });
  });
}
