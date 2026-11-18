"use client";

import { useRef, useState } from "react";

/** "Report document" / "Report as suspicious": a small form in a native <dialog>. */
export function ReportButton({
  label,
  className,
  style,
  documentId,
  claimedDocId,
  hash,
}: {
  label: string;
  className: string;
  style?: React.CSSProperties;
  documentId?: string;
  claimedDocId?: string;
  hash?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setState("sending");
    const res = await fetch("/api/report", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        documentId,
        claimedDocId,
        hash,
        reason: form.get("reason"),
        contact: form.get("contact"),
      }),
    }).catch(() => null);
    setState(res?.ok ? "sent" : "error");
  }

  return (
    <>
      <button type="button" className={className} style={style} onClick={() => ref.current?.showModal()}>
        {label}
      </button>
      <dialog
        ref={ref}
        aria-labelledby="report-title"
        style={{ border: 0, borderRadius: 18, padding: 0, width: "min(440px, calc(100vw - 32px))", color: "#141A3D" }}
        onClose={() => state === "sent" && setState("idle")}
      >
        <form method="dialog" onSubmit={submit} style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          <h2 id="report-title" style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>
            {label}
          </h2>
          {state === "sent" ? (
            <>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>Thank you. The YuProof team will look into it.</p>
              <button type="button" className="btn btn-p" onClick={() => ref.current?.close()}>
                Close
              </button>
            </>
          ) : (
            <>
              <label className="field">
                What looks wrong?
                <textarea name="reason" className="inp" rows={4} required minLength={3} maxLength={2000} />
              </label>
              <label className="field">
                Your email or phone (optional)
                <input name="contact" className="inp" maxLength={200} autoComplete="email" />
              </label>
              <p className="muted" style={{ margin: 0, fontSize: 12 }}>
                We don&apos;t receive the file, only its fingerprint and the document ID.
              </p>
              {state === "error" && (
                <p role="alert" style={{ margin: 0, fontSize: 13, color: "#912018" }}>
                  Couldn&apos;t send the report. Please try again.
                </p>
              )}
              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" className="btn btn-s" style={{ flex: 1 }} onClick={() => ref.current?.close()}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-p" style={{ flex: 1.3 }} disabled={state === "sending"}>
                  {state === "sending" ? "Sending…" : "Send report"}
                </button>
              </div>
            </>
          )}
        </form>
      </dialog>
    </>
  );
}
