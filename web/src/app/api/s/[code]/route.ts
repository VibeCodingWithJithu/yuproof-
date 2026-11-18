import { guard, ipCountry, json } from "@/lib/http";
import { verifyShareCode } from "@/lib/verify";

/** GET /api/s/:code — result for a wallet share link. */
export async function GET(req: Request, ctx: RouteContext<"/api/s/[code]">) {
  const { code } = await ctx.params;
  if (!/^[A-Za-z0-9_-]{6,64}$/.test(code)) {
    return json({ result: "not_found", reason: "unknown_id", method: "link", checkedAt: new Date().toISOString() });
  }
  return guard(async () => json(await verifyShareCode(code, { method: "link", ipCountry: ipCountry(req) })));
}
