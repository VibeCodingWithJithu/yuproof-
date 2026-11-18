import "server-only";

export const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "cache-control": "no-store" } });

export const ipCountry = (req: Request) =>
  req.headers.get("x-vercel-ip-country") ?? req.headers.get("cf-ipcountry") ?? null;

/** Turns infrastructure errors (RPC/DB down) into a 503 the UI can show with a retry. */
export async function guard(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (err) {
    console.error("[yuproof]", err);
    return json({ error: "unavailable", message: "We couldn't reach the record right now. Please try again." }, 503);
  }
}
