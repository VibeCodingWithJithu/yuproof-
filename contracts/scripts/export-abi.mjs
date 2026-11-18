// Copies contract ABIs from Hardhat artifacts into the web app, so both always match.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const out = new URL("../../web/src/lib/abi/", import.meta.url);
mkdirSync(out, { recursive: true });
for (const name of ["IssuerRegistry", "DocumentRegistry"]) {
  const art = JSON.parse(readFileSync(new URL(`../artifacts/contracts/${name}.sol/${name}.json`, import.meta.url)));
  writeFileSync(new URL(`${name}.json`, out), JSON.stringify(art.abi, null, 2) + "\n");
  console.log(`wrote web/src/lib/abi/${name}.json`);
}
