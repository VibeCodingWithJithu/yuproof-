import { db } from "@/lib/db";
import { guard, json } from "@/lib/http";

/** GET /api/issuers?q= — does this college or company issue through YuProof? (approved issuers only) */
export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 100);
  if (q.length < 2) return json({ issuers: [] });
  return guard(async () => {
    const like = `%${q.replace(/[\\%_]/g, (c) => "\\" + c)}%`;
    const issuers = await (await db()).query<{ name: string; type: string; location: string | null }>(
      `SELECT name, type, location FROM issuers WHERE status = 'approved' AND name ILIKE $1 ORDER BY name LIMIT 10`,
      [like],
    );
    return json({ issuers });
  });
}
