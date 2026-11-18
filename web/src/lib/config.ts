import "server-only";

/** Server-side configuration. All values come from environment variables (.env.local in dev). */
export const config = {
  /** Public base URL printed in QR codes: https://<domain>/v/<docId> */
  publicBaseUrl: process.env.PUBLIC_BASE_URL ?? "https://yuproof.yubhiantechnologies.in",
  /** Postgres connection string (Neon, Supabase, RDS...). Unset = embedded PGlite in .data/ (dev only). */
  databaseUrl: process.env.DATABASE_URL,
  pgliteDir: process.env.PGLITE_DIR ?? ".data/pglite",
  chain: {
    rpcUrl: process.env.CHAIN_RPC_URL ?? "http://127.0.0.1:8545",
    /** Shown to users, e.g. "Polygon Amoy" */
    name: process.env.CHAIN_NAME ?? "Local Hardhat",
    /** e.g. https://amoy.polygonscan.com/tx/ */
    explorerTxUrl: process.env.CHAIN_EXPLORER_TX_URL ?? "",
    issuerRegistry: process.env.ISSUER_REGISTRY_ADDRESS ?? "",
    documentRegistry: process.env.DOCUMENT_REGISTRY_ADDRESS ?? "",
  },
};
