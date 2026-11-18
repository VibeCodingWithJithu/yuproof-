"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckingView, type CheckStep } from "@/components/CheckingView";
import { groupedHash } from "@/components/format";
import { Icon } from "@/components/Icon";
import { ResultView } from "@/components/ResultView";
import { MAX_BYTES, readDocIdFromPdf, sha256File, takePendingFile } from "@/lib/client-file";
import type { VerifyResponse } from "@/lib/types";
import Link from "next/link";

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Phase =
  | { kind: "nofile" }
  | { kind: "running"; step: number; name: string; hash?: string }
  | { kind: "error"; step: number; name: string; hash?: string; message: string }
  | { kind: "done"; result: VerifyResponse; hash: string };

/** Upload check: hash in the browser, then compare with the record (VerifyChecking → result). */
export function CheckFlow() {
  const [phase, setPhase] = useState<Phase>({ kind: "running", step: 0, name: "" });
  const [file, setFile] = useState<File | null>(null);

  const run = useCallback(async (f: File) => {
    setFile(f);
    const name = f.name;
    setPhase({ kind: "running", step: 0, name });
    if (f.size > MAX_BYTES) {
      setPhase({ kind: "error", step: 0, name, message: "This file is larger than 20 MB. Upload the original PDF." });
      return;
    }
    const [hash, claimedDocId] = await Promise.all([sha256File(f), readDocIdFromPdf(f), pause(500)]);
    setPhase({ kind: "running", step: 1, name, hash });
    await pause(400);
    setPhase({ kind: "running", step: 2, name, hash });

    const res = await fetch("/api/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ hash, claimedDocId }),
    }).catch(() => null);
    if (!res || !res.ok) {
      const msg = res ? ((await res.json().catch(() => null))?.message as string | undefined) : undefined;
      setPhase({ kind: "error", step: 2, name, hash, message: msg ?? "Check your connection and try again." });
      return;
    }
    const result = (await res.json()) as VerifyResponse;
    setPhase({ kind: "running", step: 3, name, hash });
    await pause(450);
    setPhase({ kind: "done", result, hash });
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const f = takePendingFile();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- first render decides between picker and check
    if (f) void run(f);
    else setPhase({ kind: "nofile" });
  }, [run]);

  if (phase.kind === "done") {
    return (
      <div className="phone">
        <ResultView result={phase.result} hash={phase.hash} />
      </div>
    );
  }

  if (phase.kind === "nofile") return <PickFile onPick={run} />;

  const at = phase.step;
  const st = (i: number): CheckStep["state"] => (i < at ? "done" : i === at ? "active" : "pending");
  const steps: CheckStep[] = [
    { title: "Reading the document", detail: phase.name, state: st(0) },
    { title: "Calculating its fingerprint", detail: phase.hash ? groupedHash(phase.hash) : undefined, mono: true, state: st(1) },
    { title: "Comparing with the blockchain record", detail: at >= 2 ? (at === 2 ? "Polygon · searching…" : "Polygon") : undefined, mono: true, state: st(2) },
    { title: "Checking the issuer", state: st(3) },
  ];
  return (
    <CheckingView
      steps={steps}
      error={phase.kind === "error" ? phase.message : null}
      onRetry={phase.kind === "error" && file ? () => run(file) : undefined}
    />
  );
}

function PickFile({ onPick }: { onPick: (f: File) => void }) {
  const [drag, setDrag] = useState(false);
  return (
    <div className="phone">
      <header style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 12px", background: "#FFFFFF", borderBottom: "1px solid #E4E8F3" }}>
        <Link href="/" aria-label="Back" style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", color: "#141A3D" }}>
          <Icon name="back" size={22} width={2.2} />
        </Link>
        <h1 style={{ margin: 0, flexGrow: 1, fontSize: 17, fontWeight: 700 }}>Upload a PDF</h1>
      </header>
      <main style={{ padding: "28px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            const f = e.dataTransfer.files?.[0];
            if (f) onPick(f);
          }}
          className="card"
          style={{ border: `2px dashed ${drag ? "#2B3990" : "#C9D0E3"}`, display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center", padding: "32px 20px" }}
        >
          <Icon name="upload" size={32} stroke="#2B3990" />
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Choose the document you received</p>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
            The original PDF works best. Your file stays on your device.
          </p>
          <UploadButtonInline onPick={onPick} />
        </div>
      </main>
    </div>
  );
}

function UploadButtonInline({ onPick }: { onPick: (f: File) => void }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <button type="button" className="btn btn-p" onClick={() => input.current?.click()}>
        <Icon name="upload" />
        Choose PDF
      </button>
      <input
        ref={input}
        type="file"
        accept="application/pdf,.pdf"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) onPick(f);
        }}
      />
    </>
  );
}
