import { expect } from "chai";
import { network } from "hardhat";
import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
import { createHash } from "node:crypto";

const { ethers, networkHelpers } = await network.getOrCreate();
const { loadFixture, time } = networkHelpers;

const ZERO = ethers.ZeroHash;
const Status = { None: 0n, Approved: 1n, Suspended: 2n };
const Category = { College: 1, Company: 2 };
const DocType = { Degree: 1, MarkSheet: 2 };

/** SHA-256 of some sample bytes, as a bytes32 hex string (what the backend will do with PDFs). */
const sha256 = (s: string) => "0x" + createHash("sha256").update(s).digest("hex");

async function deploy() {
  const [admin, college, company, stranger, registrar] = await ethers.getSigners();
  const issuers = await ethers.deployContract("IssuerRegistry", [admin.address]);
  const docs = await ethers.deployContract("DocumentRegistry", [await issuers.getAddress()]);
  return { issuers, docs, admin, college, company, stranger, registrar };
}

async function deployWithIssuers() {
  const f = await deploy();
  await f.issuers.approveIssuer(f.college.address, "Sample College of Engineering", Category.College);
  await f.issuers.approveIssuer(f.company.address, "Sample Tech Pvt Ltd", Category.Company);
  return f;
}

function makeTree(names: string[]) {
  const hashes = names.map(sha256);
  const tree = StandardMerkleTree.of(hashes.map((h) => [h]), ["bytes32"]);
  const proofOf = (h: string) => tree.getProof([h]);
  return { hashes, tree, root: tree.root, proofOf };
}

// ============================================================ IssuerRegistry

describe("IssuerRegistry", () => {
  describe("deployment", () => {
    it("gives the admin both admin and registrar roles", async () => {
      const { issuers, admin } = await loadFixture(deploy);
      expect(await issuers.hasRole(await issuers.DEFAULT_ADMIN_ROLE(), admin.address)).to.equal(true);
      expect(await issuers.hasRole(await issuers.REGISTRAR_ROLE(), admin.address)).to.equal(true);
    });

    it("reverts with a zero admin", async () => {
      const factory = await ethers.getContractFactory("IssuerRegistry");
      await expect(factory.deploy(ethers.ZeroAddress)).to.be.revertedWithCustomError(factory, "ZeroAddress");
    });
  });

  describe("approveIssuer", () => {
    it("approves an issuer, stores details and emits IssuerApproved", async () => {
      const { issuers, college } = await loadFixture(deploy);
      await expect(issuers.approveIssuer(college.address, "Sample College", Category.College))
        .to.emit(issuers, "IssuerApproved")
        .withArgs(college.address, "Sample College", Category.College);

      expect(await issuers.isApproved(college.address)).to.equal(true);
      const i = await issuers.getIssuer(college.address);
      expect(i.name).to.equal("Sample College");
      expect(i.category).to.equal(BigInt(Category.College));
      expect(i.status).to.equal(Status.Approved);
      expect(i.approvedAt).to.equal(BigInt(await time.latest()));
    });

    it("reverts for a caller without the registrar role", async () => {
      const { issuers, college, stranger } = await loadFixture(deploy);
      await expect(issuers.connect(stranger).approveIssuer(college.address, "X", 1))
        .to.be.revertedWithCustomError(issuers, "AccessControlUnauthorizedAccount")
        .withArgs(stranger.address, await issuers.REGISTRAR_ROLE());
    });

    it("lets a newly granted registrar approve", async () => {
      const { issuers, college, registrar } = await loadFixture(deploy);
      await issuers.grantRole(await issuers.REGISTRAR_ROLE(), registrar.address);
      await issuers.connect(registrar).approveIssuer(college.address, "Sample College", 1);
      expect(await issuers.isApproved(college.address)).to.equal(true);
    });

    it("reverts for the zero address", async () => {
      const { issuers } = await loadFixture(deploy);
      await expect(issuers.approveIssuer(ethers.ZeroAddress, "X", 1)).to.be.revertedWithCustomError(
        issuers,
        "ZeroAddress",
      );
    });

    it("reverts for an empty name", async () => {
      const { issuers, college } = await loadFixture(deploy);
      await expect(issuers.approveIssuer(college.address, "", 1)).to.be.revertedWithCustomError(issuers, "EmptyName");
    });

    it("reverts when already approved", async () => {
      const { issuers, college } = await loadFixture(deployWithIssuers);
      await expect(issuers.approveIssuer(college.address, "Again", 1))
        .to.be.revertedWithCustomError(issuers, "AlreadyApproved")
        .withArgs(college.address);
    });

    it("reinstates a suspended issuer", async () => {
      const { issuers, college } = await loadFixture(deployWithIssuers);
      await issuers.suspendIssuer(college.address);
      await issuers.approveIssuer(college.address, "Renamed College", 1);
      const i = await issuers.getIssuer(college.address);
      expect(i.status).to.equal(Status.Approved);
      expect(i.name).to.equal("Renamed College");
      expect(i.suspendedAt).to.equal(0n);
    });
  });

  describe("suspendIssuer", () => {
    it("suspends an approved issuer and emits IssuerSuspended", async () => {
      const { issuers, college } = await loadFixture(deployWithIssuers);
      await expect(issuers.suspendIssuer(college.address)).to.emit(issuers, "IssuerSuspended").withArgs(college.address);
      expect(await issuers.isApproved(college.address)).to.equal(false);
      const i = await issuers.getIssuer(college.address);
      expect(i.status).to.equal(Status.Suspended);
      expect(i.suspendedAt).to.equal(BigInt(await time.latest()));
    });

    it("reverts for a caller without the registrar role", async () => {
      const { issuers, college, stranger } = await loadFixture(deployWithIssuers);
      await expect(issuers.connect(stranger).suspendIssuer(college.address)).to.be.revertedWithCustomError(
        issuers,
        "AccessControlUnauthorizedAccount",
      );
    });

    it("reverts for an unknown issuer", async () => {
      const { issuers, stranger } = await loadFixture(deployWithIssuers);
      await expect(issuers.suspendIssuer(stranger.address))
        .to.be.revertedWithCustomError(issuers, "NotApproved")
        .withArgs(stranger.address);
    });

    it("reverts when already suspended", async () => {
      const { issuers, college } = await loadFixture(deployWithIssuers);
      await issuers.suspendIssuer(college.address);
      await expect(issuers.suspendIssuer(college.address)).to.be.revertedWithCustomError(issuers, "NotApproved");
    });
  });

  describe("isApproved / getIssuer", () => {
    it("returns false and empty data for an unknown address", async () => {
      const { issuers, stranger } = await loadFixture(deploy);
      expect(await issuers.isApproved(stranger.address)).to.equal(false);
      const i = await issuers.getIssuer(stranger.address);
      expect(i.status).to.equal(Status.None);
      expect(i.name).to.equal("");
    });
  });
});

// ========================================================== DocumentRegistry

describe("DocumentRegistry", () => {
  it("points at the issuer registry", async () => {
    const { issuers, docs } = await loadFixture(deploy);
    expect(await docs.issuerRegistry()).to.equal(await issuers.getAddress());
  });

  describe("issue", () => {
    it("records a hash and emits Issued", async () => {
      const { docs, college } = await loadFixture(deployWithIssuers);
      const h = sha256("degree-001.pdf");
      await expect(docs.connect(college).issue(h, DocType.Degree))
        .to.emit(docs, "Issued")
        .withArgs(h, college.address, DocType.Degree);

      const rec = await docs.getRecord(h);
      expect(rec.issuer).to.equal(college.address);
      expect(rec.docType).to.equal(BigInt(DocType.Degree));
      expect(rec.issuedAt).to.equal(BigInt(await time.latest()));
    });

    it("reverts for an unapproved issuer", async () => {
      const { docs, stranger } = await loadFixture(deployWithIssuers);
      await expect(docs.connect(stranger).issue(sha256("x"), 1))
        .to.be.revertedWithCustomError(docs, "NotApprovedIssuer")
        .withArgs(stranger.address);
    });

    it("reverts for a suspended issuer", async () => {
      const { issuers, docs, college } = await loadFixture(deployWithIssuers);
      await issuers.suspendIssuer(college.address);
      await expect(docs.connect(college).issue(sha256("x"), 1)).to.be.revertedWithCustomError(
        docs,
        "NotApprovedIssuer",
      );
    });

    it("reverts for the zero hash", async () => {
      const { docs, college } = await loadFixture(deployWithIssuers);
      await expect(docs.connect(college).issue(ZERO, 1)).to.be.revertedWithCustomError(docs, "ZeroHash");
    });

    it("reverts on double issue, by the same or a different issuer", async () => {
      const { docs, college, company } = await loadFixture(deployWithIssuers);
      const h = sha256("dup.pdf");
      await docs.connect(college).issue(h, 1);
      await expect(docs.connect(college).issue(h, 1)).to.be.revertedWithCustomError(docs, "AlreadyIssued").withArgs(h);
      await expect(docs.connect(company).issue(h, 1)).to.be.revertedWithCustomError(docs, "AlreadyIssued");
    });
  });

  describe("issueBatch", () => {
    it("records a Merkle root, returns sequential batch ids and emits BatchIssued", async () => {
      const { docs, college } = await loadFixture(deployWithIssuers);
      const a = makeTree(["a1", "a2", "a3"]);
      const b = makeTree(["b1", "b2"]);

      expect(await docs.connect(college).issueBatch.staticCall(a.root, 3)).to.equal(1n);
      await expect(docs.connect(college).issueBatch(a.root, 3))
        .to.emit(docs, "BatchIssued")
        .withArgs(1n, college.address, a.root, 3);
      await expect(docs.connect(college).issueBatch(b.root, 2))
        .to.emit(docs, "BatchIssued")
        .withArgs(2n, college.address, b.root, 2);

      expect(await docs.batchCount()).to.equal(2n);
      expect(await docs.rootUsed(a.root)).to.equal(true);
      const batch = await docs.getBatch(1);
      expect(batch.merkleRoot).to.equal(a.root);
      expect(batch.issuer).to.equal(college.address);
      expect(batch.count).to.equal(3n);
      expect(batch.issuedAt).to.be.greaterThan(0n);
    });

    it("reverts for an unapproved issuer", async () => {
      const { docs, stranger } = await loadFixture(deployWithIssuers);
      await expect(docs.connect(stranger).issueBatch(makeTree(["x"]).root, 1)).to.be.revertedWithCustomError(
        docs,
        "NotApprovedIssuer",
      );
    });

    it("reverts for a zero root", async () => {
      const { docs, college } = await loadFixture(deployWithIssuers);
      await expect(docs.connect(college).issueBatch(ZERO, 1)).to.be.revertedWithCustomError(docs, "ZeroHash");
    });

    it("reverts for a zero count", async () => {
      const { docs, college } = await loadFixture(deployWithIssuers);
      await expect(docs.connect(college).issueBatch(makeTree(["x"]).root, 0)).to.be.revertedWithCustomError(
        docs,
        "EmptyBatch",
      );
    });

    it("reverts when the same root is recorded twice", async () => {
      const { docs, college, company } = await loadFixture(deployWithIssuers);
      const { root } = makeTree(["x", "y"]);
      await docs.connect(college).issueBatch(root, 2);
      await expect(docs.connect(company).issueBatch(root, 2))
        .to.be.revertedWithCustomError(docs, "RootAlreadyUsed")
        .withArgs(root);
    });
  });

  describe("verify", () => {
    it("returns exists=false for an unknown hash", async () => {
      const { docs } = await loadFixture(deployWithIssuers);
      const [exists, revoked, issuer, issuedAt] = await docs.verify(sha256("unknown"));
      expect([exists, revoked, issuer, issuedAt]).to.deep.equal([false, false, ethers.ZeroAddress, 0n]);
    });

    it("returns genuine data for an issued hash", async () => {
      const { docs, college } = await loadFixture(deployWithIssuers);
      const h = sha256("ok.pdf");
      await docs.connect(college).issue(h, 1);
      const [exists, revoked, issuer, issuedAt] = await docs.verify(h);
      expect(exists).to.equal(true);
      expect(revoked).to.equal(false);
      expect(issuer).to.equal(college.address);
      expect(issuedAt).to.equal(BigInt(await time.latest()));
    });

    it("still finds documents after the issuer is suspended (status checked via IssuerRegistry)", async () => {
      const { issuers, docs, college } = await loadFixture(deployWithIssuers);
      const h = sha256("before-suspension.pdf");
      await docs.connect(college).issue(h, 1);
      await issuers.suspendIssuer(college.address);
      const [exists] = await docs.verify(h);
      expect(exists).to.equal(true);
      expect(await issuers.isApproved(college.address)).to.equal(false);
    });

    it("returns false for a one-byte change (tampered file)", async () => {
      const { docs, college } = await loadFixture(deployWithIssuers);
      await docs.connect(college).issue(sha256("marks: 78"), 1);
      const [exists] = await docs.verify(sha256("marks: 98"));
      expect(exists).to.equal(false);
    });
  });

  describe("verifyInBatch", () => {
    it("verifies every member of a batch with its proof", async () => {
      const { docs, college } = await loadFixture(deployWithIssuers);
      const t = makeTree(["s1", "s2", "s3", "s4", "s5"]);
      await docs.connect(college).issueBatch(t.root, 5);
      const at = BigInt(await time.latest());
      for (const h of t.hashes) {
        const [exists, revoked, issuer, issuedAt] = await docs.verifyInBatch(1, h, t.proofOf(h));
        expect([exists, revoked, issuer, issuedAt]).to.deep.equal([true, false, college.address, at]);
      }
    });

    it("works for a batch of one (empty proof)", async () => {
      const { docs, college } = await loadFixture(deployWithIssuers);
      const t = makeTree(["only"]);
      await docs.connect(college).issueBatch(t.root, 1);
      const [exists] = await docs.verifyInBatch(1, t.hashes[0], []);
      expect(exists).to.equal(true);
    });

    it("returns exists=false for a hash not in the batch", async () => {
      const { docs, college } = await loadFixture(deployWithIssuers);
      const t = makeTree(["s1", "s2"]);
      await docs.connect(college).issueBatch(t.root, 2);
      const [exists] = await docs.verifyInBatch(1, sha256("forged"), t.proofOf(t.hashes[0]));
      expect(exists).to.equal(false);
    });

    it("returns exists=false for a valid proof used against the wrong batch", async () => {
      const { docs, college } = await loadFixture(deployWithIssuers);
      const a = makeTree(["a1", "a2"]);
      const b = makeTree(["b1", "b2"]);
      await docs.connect(college).issueBatch(a.root, 2);
      await docs.connect(college).issueBatch(b.root, 2);
      const [exists] = await docs.verifyInBatch(2, a.hashes[0], a.proofOf(a.hashes[0]));
      expect(exists).to.equal(false);
    });

    it("rejects an internal tree node passed as a leaf", async () => {
      const { docs, college } = await loadFixture(deployWithIssuers);
      const t = makeTree(["n1", "n2", "n3", "n4"]);
      await docs.connect(college).issueBatch(t.root, 4);
      // Sibling pair hash = an internal node. With double-hashed leaves it cannot pass as a leaf.
      const proof = t.proofOf(t.hashes[0]);
      const [exists] = await docs.verifyInBatch(1, proof[proof.length - 1], []);
      expect(exists).to.equal(false);
    });

    it("returns exists=false for an unknown batch id", async () => {
      const { docs } = await loadFixture(deployWithIssuers);
      const [exists, , issuer] = await docs.verifyInBatch(99, sha256("x"), []);
      expect(exists).to.equal(false);
      expect(issuer).to.equal(ethers.ZeroAddress);
    });
  });

  describe("revoke (single)", () => {
    it("lets the original issuer cancel, with a replacement, and emits Revoked", async () => {
      const { docs, college } = await loadFixture(deployWithIssuers);
      const h = sha256("wrong-name.pdf");
      const fixed = sha256("correct-name.pdf");
      await docs.connect(college).issue(h, 1);
      await docs.connect(college).issue(fixed, 1);

      await expect(docs.connect(college).revoke(h, fixed))
        .to.emit(docs, "Revoked")
        .withArgs(h, college.address, fixed);

      const [exists, revoked, issuer] = await docs.verify(h);
      expect([exists, revoked, issuer]).to.deep.equal([true, true, college.address]);
      const r = await docs.getRevocation(college.address, h);
      expect(r.replacementHash).to.equal(fixed);
      expect(r.revokedAt).to.equal(BigInt(await time.latest()));
      // The replacement itself stays genuine
      expect((await docs.verify(fixed))[1]).to.equal(false);
    });

    it("allows cancelling without a replacement", async () => {
      const { docs, college } = await loadFixture(deployWithIssuers);
      const h = sha256("cancel.pdf");
      await docs.connect(college).issue(h, 1);
      await docs.connect(college).revoke(h, ZERO);
      expect((await docs.verify(h))[1]).to.equal(true);
    });

    it("reverts when revoked by a non-issuer (stranger or another approved issuer)", async () => {
      const { docs, college, company, stranger } = await loadFixture(deployWithIssuers);
      const h = sha256("mine.pdf");
      await docs.connect(college).issue(h, 1);
      await expect(docs.connect(stranger).revoke(h, ZERO))
        .to.be.revertedWithCustomError(docs, "NotOriginalIssuer")
        .withArgs(stranger.address);
      await expect(docs.connect(company).revoke(h, ZERO)).to.be.revertedWithCustomError(docs, "NotOriginalIssuer");
    });

    it("reverts for a hash that was never issued", async () => {
      const { docs, college } = await loadFixture(deployWithIssuers);
      const h = sha256("never");
      await expect(docs.connect(college).revoke(h, ZERO)).to.be.revertedWithCustomError(docs, "NotIssued").withArgs(h);
    });

    it("reverts on double revoke", async () => {
      const { docs, college } = await loadFixture(deployWithIssuers);
      const h = sha256("twice.pdf");
      await docs.connect(college).issue(h, 1);
      await docs.connect(college).revoke(h, ZERO);
      await expect(docs.connect(college).revoke(h, ZERO)).to.be.revertedWithCustomError(docs, "AlreadyRevoked");
    });

    it("reverts when the replacement is the document itself", async () => {
      const { docs, college } = await loadFixture(deployWithIssuers);
      const h = sha256("self.pdf");
      await docs.connect(college).issue(h, 1);
      await expect(docs.connect(college).revoke(h, h)).to.be.revertedWithCustomError(docs, "SelfReplacement");
    });

    it("still lets a suspended issuer cancel its own documents", async () => {
      const { issuers, docs, college } = await loadFixture(deployWithIssuers);
      const h = sha256("suspended-cancel.pdf");
      await docs.connect(college).issue(h, 1);
      await issuers.suspendIssuer(college.address);
      await docs.connect(college).revoke(h, ZERO);
      expect((await docs.verify(h))[1]).to.equal(true);
    });
  });

  describe("revokeInBatch", () => {
    it("cancels one document in a batch without affecting the others", async () => {
      const { docs, college } = await loadFixture(deployWithIssuers);
      const t = makeTree(["r1", "r2", "r3"]);
      await docs.connect(college).issueBatch(t.root, 3);
      const [target, other] = t.hashes;

      await expect(docs.connect(college).revokeInBatch(1, target, t.proofOf(target), ZERO))
        .to.emit(docs, "Revoked")
        .withArgs(target, college.address, ZERO);

      expect((await docs.verifyInBatch(1, target, t.proofOf(target)))[1]).to.equal(true);
      expect((await docs.verifyInBatch(1, other, t.proofOf(other)))[1]).to.equal(false);
    });

    it("reverts when revoked by a non-issuer", async () => {
      const { docs, college, company } = await loadFixture(deployWithIssuers);
      const t = makeTree(["r1", "r2"]);
      await docs.connect(college).issueBatch(t.root, 2);
      await expect(
        docs.connect(company).revokeInBatch(1, t.hashes[0], t.proofOf(t.hashes[0]), ZERO),
      ).to.be.revertedWithCustomError(docs, "NotOriginalIssuer");
    });

    it("reverts for an unknown batch", async () => {
      const { docs, college } = await loadFixture(deployWithIssuers);
      await expect(docs.connect(college).revokeInBatch(7, sha256("x"), [], ZERO))
        .to.be.revertedWithCustomError(docs, "UnknownBatch")
        .withArgs(7n);
    });

    it("reverts for a bad proof", async () => {
      const { docs, college } = await loadFixture(deployWithIssuers);
      const t = makeTree(["r1", "r2"]);
      await docs.connect(college).issueBatch(t.root, 2);
      await expect(
        docs.connect(college).revokeInBatch(1, sha256("not-in-batch"), t.proofOf(t.hashes[0]), ZERO),
      ).to.be.revertedWithCustomError(docs, "NotInBatch");
    });

    it("reverts on double revoke", async () => {
      const { docs, college } = await loadFixture(deployWithIssuers);
      const t = makeTree(["r1", "r2"]);
      await docs.connect(college).issueBatch(t.root, 2);
      const h = t.hashes[1];
      await docs.connect(college).revokeInBatch(1, h, t.proofOf(h), ZERO);
      await expect(docs.connect(college).revokeInBatch(1, h, t.proofOf(h), ZERO)).to.be.revertedWithCustomError(
        docs,
        "AlreadyRevoked",
      );
    });
  });
});
