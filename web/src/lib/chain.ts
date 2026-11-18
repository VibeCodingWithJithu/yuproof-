import "server-only";
import { Contract, JsonRpcProvider } from "ethers";
import IssuerRegistryAbi from "./abi/IssuerRegistry.json";
import DocumentRegistryAbi from "./abi/DocumentRegistry.json";
import { config } from "./config";

export interface ChainStatus {
  exists: boolean;
  revoked: boolean;
  issuer: string;
  /** unix seconds */
  issuedAt: number;
}

const g = globalThis as unknown as { __yuproofChain?: ReturnType<typeof connect> };

function connect() {
  const { rpcUrl, issuerRegistry, documentRegistry } = config.chain;
  if (!issuerRegistry || !documentRegistry) {
    throw new Error("ISSUER_REGISTRY_ADDRESS and DOCUMENT_REGISTRY_ADDRESS must be set.");
  }
  const provider = new JsonRpcProvider(rpcUrl, undefined, { staticNetwork: true });
  return {
    issuers: new Contract(issuerRegistry, IssuerRegistryAbi, provider),
    documents: new Contract(documentRegistry, DocumentRegistryAbi, provider),
  };
}

function chain() {
  g.__yuproofChain ??= connect();
  return g.__yuproofChain;
}

/** Looks up a document fingerprint on-chain, singly issued or inside a batch (with its Merkle proof). */
export async function chainVerify(
  hash: string,
  batch?: { chainBatchId: number | string; proof: string[] },
): Promise<ChainStatus> {
  const { documents } = chain();
  const r: [boolean, boolean, string, bigint] = batch
    ? await documents.verifyInBatch(BigInt(batch.chainBatchId), hash, batch.proof)
    : await documents.verify(hash);
  return { exists: r[0], revoked: r[1], issuer: r[2], issuedAt: Number(r[3]) };
}

export async function chainIssuerApproved(address: string): Promise<boolean> {
  return chain().issuers.isApproved(address);
}
