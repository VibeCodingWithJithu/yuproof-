"use client";

import { useState } from "react";

/** "Does the issuer use YuProof?" on the Not found screen. */
export function IssuerSearch() {
  const [results, setResults] = useState<{ name: string; location: string | null }[] | null>(null);
  const [busy, setBusy] = useState(false);

  async function search(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = String(new FormData(e.currentTarget).get("q") ?? "").trim();
    if (q.length < 2) return;
    setBusy(true);
    const res = await fetch(`/api/issuers?q=${encodeURIComponent(q)}`).catch(() => null);
    setResults(res?.ok ? (await res.json()).issuers : []);
    setBusy(false);
  }

  return (
    <section className="card" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>Does the issuer use YuProof?</h2>
      <form onSubmit={search} style={{ display: "flex", gap: 8 }}>
        <label className="sr" htmlFor="iss">
          Issuer name
        </label>
        <input id="iss" name="q" className="inp" placeholder="Search college or company" minLength={2} required />
        <button type="submit" className="btn btn-p" style={{ flexShrink: 0 }} disabled={busy}>
          Search
        </button>
      </form>
      {results && (
        <div aria-live="polite" style={{ marginTop: 6, fontSize: 14 }}>
          {results.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>
              No approved issuer with that name uses YuProof yet. Check the document with them directly.
            </p>
          ) : (
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
              {results.map((i) => (
                <li key={i.name} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontWeight: 700 }}>{i.name}</span>
                  <span className="chip" style={{ background: "#E8EBF8", color: "#2B3990" }}>
                    Uses YuProof
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
