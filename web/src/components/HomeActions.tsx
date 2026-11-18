"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { setPendingFile } from "@/lib/client-file";
import { normalizeDocId } from "@/lib/types";
import { Icon } from "./Icon";

/** Hidden file input + button; the picked file goes to /check in memory (never uploaded). */
export function UploadButton({ className, style, label = "Upload PDF" }: { className: string; style?: React.CSSProperties; label?: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <button type="button" className={className} style={style} onClick={() => input.current?.click()}>
        <Icon name="upload" />
        {label}
      </button>
      <input
        ref={input}
        type="file"
        accept="application/pdf,.pdf"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          setPendingFile(f);
          router.push("/check");
        }}
      />
    </>
  );
}

export function HeroActions() {
  return (
    <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 10 }}>
      <Link href="/scan" className="btn btn-w" style={{ height: 54, fontSize: 16 }}>
        <Icon name="scan" />
        Scan QR code
      </Link>
      <UploadButton className="btn" style={{ height: 54, fontSize: 16, background: "#3E4DA6", color: "#FFFFFF" }} />
    </div>
  );
}

export function DocIdForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="field"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const raw = String(new FormData(e.currentTarget).get("did") ?? "");
        const id = normalizeDocId(raw);
        if (!id) {
          setError("Enter the ID as printed on the document, e.g. YP-2026-004213.");
          return;
        }
        setError(null);
        router.push(`/v/${id}?via=id`);
      }}
    >
      <label htmlFor="did">Or enter the document ID</label>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          id="did"
          name="did"
          className="inp"
          placeholder="e.g. YP-2026-004213"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={!!error}
          aria-describedby={error ? "did-err" : undefined}
        />
        <button type="submit" className="btn btn-p" style={{ flexShrink: 0 }}>
          Check
        </button>
      </div>
      {error && (
        <span id="did-err" role="alert" style={{ fontSize: 13, fontWeight: 500, color: "#912018" }}>
          {error}
        </span>
      )}
    </form>
  );
}

export function LanguageSwitch() {
  return (
    <details style={{ position: "relative" }}>
      <summary
        style={{ listStyle: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#FFFFFF", padding: "8px 12px", borderRadius: 999, background: "#3E4DA6" }}
        aria-label="Language"
      >
        English · हिं · తె
      </summary>
      <ul
        style={{ position: "absolute", right: 0, top: 42, zIndex: 10, margin: 0, padding: 6, listStyle: "none", background: "#FFFFFF", color: "#141A3D", borderRadius: 12, boxShadow: "0 12px 30px rgba(20,26,61,.18)", minWidth: 180, fontSize: 14 }}
      >
        <li style={{ padding: "8px 10px", fontWeight: 700 }} aria-current="true">
          English ✓
        </li>
        <li style={{ padding: "8px 10px" }} className="muted">
          हिन्दी · coming soon
        </li>
        <li style={{ padding: "8px 10px" }} className="muted">
          తెలుగు · coming soon
        </li>
      </ul>
    </details>
  );
}
