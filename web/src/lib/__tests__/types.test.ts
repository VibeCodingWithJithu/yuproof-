import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizeDocId, parseQrPayload } from "../types";

describe("normalizeDocId", () => {
  it("accepts and upper-cases a valid ID", () => {
    assert.equal(normalizeDocId(" yp-2026-004213 "), "YP-2026-004213");
  });
  it("finds the ID inside other text", () => {
    assert.equal(normalizeDocId("Document ID: YP-2026-004213."), "YP-2026-004213");
  });
  it("rejects malformed IDs", () => {
    for (const bad of ["", "YP-26-004213", "YP-2026-04213", "XX-2026-004213", "YP-2026-0042134"]) {
      assert.equal(normalizeDocId(bad), null);
    }
  });
});

describe("parseQrPayload", () => {
  it("reads a document URL from any host", () => {
    assert.deepEqual(parseQrPayload("https://yuproof.yubhiantechnologies.in/v/YP-2026-004213"), { docId: "YP-2026-004213" });
    assert.deepEqual(parseQrPayload("http://localhost:3000/v/yp-2026-004213?x=1"), { docId: "YP-2026-004213" });
  });
  it("reads a share link", () => {
    assert.deepEqual(parseQrPayload("https://yuproof.yubhiantechnologies.in/s/demo-share-ananya"), { shareCode: "demo-share-ananya" });
  });
  it("reads a bare ID", () => {
    assert.deepEqual(parseQrPayload("YP-2026-004213"), { docId: "YP-2026-004213" });
  });
  it("rejects unrelated codes", () => {
    assert.equal(parseQrPayload("https://example.com/menu"), null);
    assert.equal(parseQrPayload("WIFI:S:home;T:WPA;P:secret;;"), null);
    assert.equal(parseQrPayload("https://x.example/v/not-an-id"), null);
  });
});
