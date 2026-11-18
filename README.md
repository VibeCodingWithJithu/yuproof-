# YuProof

Tamper-proof documents for colleges, institutes and companies. Only a SHA-256 fingerprint of each document goes on
Polygon; personal data stays off-chain. A product of Yubhian Technologies LLP. **Status: in development.**

Spec and designs: [YuProof-ClaudeCode-Handoff/](YuProof-ClaudeCode-Handoff/) (`YUPROOF_SPEC.md`, `YUPROOF_CONTEXT.md`, `screens/`).

| Folder | What |
|---|---|
| [contracts/](contracts/) | Solidity + Hardhat 3: `IssuerRegistry`, `DocumentRegistry`, tests, Ignition deploy (milestone 1) |
| [web/](web/) | Next.js 16 app: public verification (milestone 2); issuer, wallet, HR and admin later |

## Milestone status

| Milestone | Status |
|---|---|
| 1. Contracts | Done: 47 tests passing. Amoy deploy waiting for a funded deployer wallet |
| 2. Verify | Done locally: home, scan, checking, 4 result screens, verify API, PDF proof report, share links, report form |

## Run locally (milestone 2 end to end)

```bash
# 1. contracts
cd contracts && npm install && npm test
npm run node                      # terminal A: local chain on :8545 (leave running)

# 2. web (terminal B)
cd web && npm install
npm run seed                      # deploys to the local chain, creates SAMPLE docs + PDFs in web/samples/
npm run dev                       # http://localhost:3000
npm run e2e                       # optional: browser smoke test (Chrome), screenshots in web/.data/screens
```

Upload the PDFs in `web/samples/` to see each result (genuine, tampered, cancelled, not found), or open
`/v/YP-2026-004213`, `/v/YP-2026-004214`, `/s/demo-share-ananya`. Restarting the local chain wipes it: run `npm run seed` again
(with the dev server stopped, because embedded PGlite allows one process).

## Deploy contracts to Polygon Amoy

```bash
cd contracts
npm run keygen          # once: creates a TESTNET-only key in contracts/.env (git-ignored), prints the address
# fund that address with test POL: https://faucet.polygon.technology/
npm run balance:amoy
npm run deploy:amoy     # addresses are written to ignition/deployments/chain-80002/
```

Then set `ISSUER_REGISTRY_ADDRESS`, `DOCUMENT_REGISTRY_ADDRESS`, `CHAIN_RPC_URL`, `CHAIN_NAME` and
`CHAIN_EXPLORER_TX_URL` for the web app (see [web/.env.example](web/.env.example)).

## Design notes

- **Verification**: the browser computes SHA-256 of an uploaded file and reads the document ID from its text; only the hash
  and ID go to `POST /api/verify`. Hash match → Genuine/Cancelled (from chain). No match but a known ID → Tampered. Otherwise Not found.
- **Batches**: one Merkle root per batch on chain (OpenZeppelin `StandardMerkleTree`, double-hashed leaves); each document's
  proof is stored off-chain. `revokeInBatch` was added next to the spec's `revoke` so batch documents can be cancelled too.
- **Database**: plain Postgres (`DATABASE_URL`). Without it, dev uses embedded PGlite in `web/.data/`. Schema: `web/src/lib/schema.ts`.
- All names, colleges, IDs and hashes in the seed are **sample data**.
