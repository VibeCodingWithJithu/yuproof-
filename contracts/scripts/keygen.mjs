// Creates a fresh TESTNET-ONLY deployer wallet and writes it to .env (git-ignored).
// The private key is never printed. Refuses to overwrite an existing key.
import { Wallet } from "ethers";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const path = new URL("../.env", import.meta.url);
let env = existsSync(path) ? readFileSync(path, "utf8") : "";
if (/^AMOY_PRIVATE_KEY=0x[0-9a-fA-F]{64}/m.test(env)) {
  const key = env.match(/^AMOY_PRIVATE_KEY=(0x[0-9a-fA-F]{64})/m)[1];
  console.log("A key already exists in .env. Address:", new Wallet(key).address);
  process.exit(0);
}
const w = Wallet.createRandom();
const lines = env.split(/\r?\n/).filter((l) => l && !l.startsWith("AMOY_PRIVATE_KEY="));
if (!lines.some((l) => l.startsWith("AMOY_RPC_URL="))) lines.push("AMOY_RPC_URL=https://rpc-amoy.polygon.technology");
lines.push(`AMOY_PRIVATE_KEY=${w.privateKey}`);
writeFileSync(path, lines.join("\n") + "\n");
console.log("New Amoy deployer address:", w.address);
console.log("Fund it with test POL: https://faucet.polygon.technology/ (Amoy)");
