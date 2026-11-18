import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/** Deploys IssuerRegistry (deployer = admin) and DocumentRegistry wired to it. */
export default buildModule("YuProof", (m) => {
  const admin = m.getParameter("admin", m.getAccount(0));
  const issuerRegistry = m.contract("IssuerRegistry", [admin]);
  const documentRegistry = m.contract("DocumentRegistry", [issuerRegistry]);
  return { issuerRegistry, documentRegistry };
});
