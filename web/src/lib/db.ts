import "server-only";
import { config } from "./config";
import { openDb, type Db } from "./db-core";

export type { Db };

const g = globalThis as unknown as { __yuproofDb?: Promise<Db> };

/** Shared database connection for the app; creates tables on first use. */
export function db(): Promise<Db> {
  if (!g.__yuproofDb) {
    if (!config.databaseUrl && process.env.NODE_ENV === "production" && !process.env.ALLOW_PGLITE) {
      throw new Error("DATABASE_URL is not set. Embedded PGlite is for local development only.");
    }
    g.__yuproofDb = openDb(config.databaseUrl, config.pgliteDir);
  }
  return g.__yuproofDb;
}
