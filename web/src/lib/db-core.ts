// Database connection shared by the app and by scripts (no Next.js-only imports here).
import { mkdirSync } from "node:fs";
import { SCHEMA_SQL } from "./schema";

export interface Db {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
  close(): Promise<void>;
}

/** Postgres when `databaseUrl` is set (Neon, Supabase, RDS…), otherwise embedded PGlite in `pgliteDir`. */
export async function openDb(databaseUrl: string | undefined, pgliteDir: string): Promise<Db> {
  const conn = databaseUrl ? await openPostgres(databaseUrl) : await openPglite(pgliteDir);
  await migrate(conn);
  return conn;
}

async function openPostgres(url: string): Promise<Db> {
  const { default: postgres } = await import("postgres");
  const sql = postgres(url, { max: 5, prepare: false, onnotice: () => {} });
  return {
    query: async <T,>(text: string, params: unknown[] = []) =>
      (await sql.unsafe(text, params as never[])) as unknown as T[],
    close: () => sql.end(),
  };
}

async function openPglite(dir: string): Promise<Db> {
  const { PGlite } = await import("@electric-sql/pglite");
  mkdirSync(dir, { recursive: true });
  const pg = await PGlite.create(dir);
  return {
    query: async <T,>(text: string, params: unknown[] = []) => (await pg.query<T>(text, params)).rows,
    close: () => pg.close(),
  };
}

export async function migrate(conn: Db) {
  for (const stmt of SCHEMA_SQL.split(/;\s*$/m).map((s) => s.trim()).filter(Boolean)) {
    await conn.query(stmt);
  }
}
