"use client";

import Link from "next/link";
import { useState } from "react";
import type { VerifyResponse } from "@/lib/types";
import { Guilloche } from "./Guilloche";
import { Icon, type IconName } from "./Icon";
import { ReportButton } from "./ReportDialog";
import { Seal, type SealVariant } from "./Seal";
import { fmtDate, fmtDay, initials, shortHash } from "./format";
import { IssuerSearch } from "./IssuerSearch";

type Tone = "genuine" | "tampered" | "cancelled" | "notfound";

const TONES: Record<Tone, { bg: string; lines: string; pill: string; sub: string; tick: string; seal: SealVariant }> = {
  genuine: { bg: "#2B3990", lines: "#3A49A8", pill: "#3E4DA6", sub: "#DDE2F5", tick: "#34D399", seal: "verified" },
  tampered: { bg: "#8E1B13", lines: "#A3291F", pill: "#A8352B", sub: "#FFE1DD", tick: "#FFFFFF", seal: "tampered" },
  cancelled: { bg: "#8A4B08", lines: "#A0601C", pill: "#A0601C", sub: "#F1F3FF", tick: "#34D399", seal: "cancelled" },
  notfound: { bg: "#3D4560", lines: "#4B5472", pill: "#4B5472", sub: "#F1F3FF", tick: "#34D399", seal: "notfound" },
};

interface Chip {
  label: string;
  /** passed = blue-ish chip with tick; flag = white chip highlighting the problem */
  kind: "passed" | "flag";
  icon?: IconName;
  colour?: string;
  text?: string;
}

function Hero({ tone, title, subtitle, chips }: { tone: Tone; title: string; subtitle: string; chips: Chip[] }) {
  const t = TONES[tone];
  return (
    <section className="hero" style={{ background: t.bg }}>
      <Guilloche stroke={t.lines} />
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" aria-label="YuProof home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/yuproof-logo-horizontal-white.svg" alt="YuProof" style={{ height: 26, width: "auto", display: "block" }} />
        </Link>
        <Link href="/" className="hero-pill" style={{ background: t.pill }}>
          New check
        </Link>
      </div>
      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, textAlign: "center" }}>
        <Seal variant={t.seal} />
        <h1 className="serif" style={{ margin: "2px 0 0", fontSize: tone === "genuine" || tone === "tampered" ? 36 : 34, lineHeight: 1.05 }}>
          {title}
        </h1>
        <p style={{ margin: 0, fontSize: 14, color: t.sub }}>{subtitle}</p>
      </div>
      <ul style={{ position: "relative", display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8, margin: 0, padding: 0, listStyle: "none" }}>
        {chips.map((c) => (
          <li
            key={c.label}
            className="hero-chip"
            style={c.kind === "flag" ? { background: "#FFFFFF", color: c.text, fontWeight: 800 } : { background: t.pill }}
          >
            {c.kind === "flag" ? (
              <Icon name={c.icon ?? "close"} size={13} stroke={c.colour} width={3} />
            ) : (
              <Icon name="check" size={13} stroke={t.tick} width={3} />
            )}
            {c.label}
          </li>
        ))}
      </ul>
    </section>
  );
}

function SampleNote({ show }: { show?: boolean }) {
  return show ? <> · Sample data</> : null;
}

// ------------------------------------------------------------------ Genuine

function Genuine({ r }: { r: VerifyResponse }) {
  const [details, setDetails] = useState(false);
  const d = r.document!;
  const issuer = r.issuer!;
  const checks = r.checks!;
  const passed = [checks.issuer, checks.unchanged !== false, checks.notCancelled].filter(Boolean).length;
  const chips: Chip[] = [
    checks.issuer
      ? { label: "Verified issuer", kind: "passed" }
      : { label: issuer.status === "blocked" ? "Issuer on warning list" : "Issuer suspended", kind: "flag", icon: "warn", colour: "#B45309", text: "#7C4A03" },
    { label: checks.unchanged ? "Unchanged" : "On blockchain", kind: "passed" },
    { label: "Not cancelled", kind: "passed" },
  ];

  return (
    <>
      <Hero
        tone="genuine"
        title="Genuine"
        subtitle={passed === 3 ? "Safe to accept · 3 of 3 checks passed" : `${passed} of 3 checks passed · see the issuer status`}
        chips={chips}
      />
      <DocumentCard r={r} />

      <section style={{ margin: "20px 20px 0", display: "flex", flexDirection: "column" }}>
        <h2 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 800 }}>This document&apos;s journey</h2>
        <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column" }}>
          {r.journey!.map((s, i, all) => {
            const last = i === all.length - 1;
            return (
              <li key={s.kind + i} style={{ display: "flex", gap: 12 }}>
                <span style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <span style={{ width: 12, height: 12, borderRadius: 6, flexShrink: 0, background: last ? "#0E9F6E" : "#2B3990" }} />
                  {!last && <span style={{ width: 2, height: 28, background: "#C9D0E3" }} />}
                </span>
                <span style={{ fontSize: 14, marginTop: -3 }}>
                  <strong>{s.label}</strong> {s.text}
                  {s.text ? " · " : "· "}
                  {s.kind === "checked" ? "just now" : fmtDay(s.at)}
                </span>
              </li>
            );
          })}
        </ol>
        <p style={{ margin: "14px 0 0", fontSize: 12, color: "#4A5368" }}>
          Fingerprint {shortHash(d.hash)} · {r.chain!.network}
          <SampleNote show={r.isSample} />
        </p>
        {checks.unchanged === null && (
          <p style={{ margin: "6px 0 0", fontSize: 12, color: "#4A5368" }}>
            Compare these details with the document you were given, or upload the PDF to check the file itself.
          </p>
        )}
        {details && <Details r={r} />}
      </section>

      <div className="bottom-bar">
        <button type="button" className="btn btn-s" style={{ flex: 1, height: 50 }} aria-expanded={details} onClick={() => setDetails((v) => !v)}>
          {details ? "Hide details" : "View document"}
        </button>
        <a className="btn btn-p" style={{ flex: 1.3, height: 50, fontWeight: 800 }} href={`/api/proof/${d.id}`} download>
          Download proof
        </a>
      </div>
    </>
  );
}

function DocumentCard({ r }: { r: VerifyResponse }) {
  const d = r.document!;
  return (
    <section className="overlap" aria-label="Document">
      <div className="strip" />
      <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span aria-hidden="true" style={{ width: 48, height: 48, flexShrink: 0, borderRadius: 14, background: "#FFE9D6", color: "#9A3D00", fontSize: 17, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {initials(d.holderName)}
          </span>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>{d.holderName}</p>
            <p className="serif" style={{ margin: 0, fontSize: 16, color: "#2B3990" }}>
              {d.title}
            </p>
          </div>
        </div>
        <IssuerRow r={r} />
      </div>
    </section>
  );
}

function IssuerRow({ r }: { r: VerifyResponse }) {
  const d = r.document!;
  const issuer = r.issuer!;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 12, background: "#F1ECDF" }}>
      <span aria-hidden="true" style={{ width: 36, height: 36, flexShrink: 0, borderRadius: 10, background: "#2B3990", color: "#FFFFFF", fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {initials(issuer.name)}
      </span>
      <div style={{ flexGrow: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
          {issuer.name}
          {issuer.verified && (
            <svg width="15" height="15" viewBox="0 0 24 24" role="img" aria-label="Verified issuer" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="11" fill="#2B3990" />
              <path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </p>
        <p style={{ margin: 0, fontSize: 12, color: "#5B5F73" }}>
          Issued {fmtDate(d.issuedAt)} · {d.id}
        </p>
      </div>
    </div>
  );
}

function Details({ r }: { r: VerifyResponse }) {
  const d = r.document!;
  const c = r.chain!;
  const rows: [string, React.ReactNode][] = [
    ["Holder", d.holderName],
    ["Document", d.title],
    ["Issued by", r.issuer!.name],
    ["Issued on", fmtDate(d.issuedAt)],
    ["Document ID", <span key="id" className="mono">{d.id}</span>],
    ["Network", c.network],
    [
      "Transaction",
      c.txHash ? (
        c.txUrl ? (
          <a key="tx" className="mono" href={c.txUrl} target="_blank" rel="noreferrer">
            {shortHash(c.txHash)}
          </a>
        ) : (
          <span key="tx" className="mono">{shortHash(c.txHash)}</span>
        )
      ) : (
        "—"
      ),
    ],
    ["Fingerprint", <span key="fp" className="mono" style={{ wordBreak: "break-all" }}>{d.hash}</span>],
  ];
  return (
    <dl className="card" style={{ margin: "16px 0 0", padding: "6px 16px", display: "grid", gridTemplateColumns: "auto 1fr", columnGap: 14 }}>
      {rows.map(([k, v]) => (
        <div key={k} style={{ display: "contents" }}>
          <dt className="muted" style={{ fontSize: 13, fontWeight: 600, padding: "10px 0", borderBottom: "1px solid #EEF1F7" }}>{k}</dt>
          <dd style={{ margin: 0, fontSize: 13, fontWeight: 600, padding: "10px 0", borderBottom: "1px solid #EEF1F7", minWidth: 0 }}>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

// ----------------------------------------------------------------- Tampered

function Tampered({ r, hash }: { r: VerifyResponse; hash?: string }) {
  const d = r.document!;
  const issuer = r.issuer!;
  const word = issuer.type === "company" ? "company" : issuer.type === "institute" ? "institute" : "college";
  return (
    <>
      <Hero
        tone="tampered"
        title="Doesn't match"
        subtitle="This file was edited after it was issued"
        chips={[
          issuer.verified ? { label: "Verified issuer", kind: "passed" } : { label: "Issuer not verified", kind: "flag", icon: "warn", colour: "#B42318", text: "#912018" },
          { label: "File edited", kind: "flag", icon: "close", colour: "#B42318", text: "#912018" },
          r.checks!.notCancelled
            ? { label: "Original not cancelled", kind: "passed" }
            : { label: "Original cancelled", kind: "flag", icon: "cancel", colour: "#B45309", text: "#7C4A03" },
        ]}
      />
      <section className="overlap" aria-label="What this file claims to be">
        <div style={{ height: 6, background: "repeating-linear-gradient(90deg, #B42318 0 10px, #FBF8F1 10px 20px)" }} />
        <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
          <p className="lbl" style={{ color: "#5B5F73" }}>This file claims to be</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <p className="serif" style={{ margin: 0, fontSize: 19, color: "#1B1F33" }}>{d.title}</p>
            <p style={{ margin: 0, fontSize: 14, color: "#3D4157" }}>
              {d.holderName} · {issuer.name}
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, padding: "10px 12px", borderRadius: 12, background: "#FDECEC" }}>
            <Icon name="warn" size={18} stroke="#B42318" width={2.4} style={{ marginTop: 1 }} />
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: "#7A1A13" }}>
              Its fingerprint doesn&apos;t match the one the {word} recorded. Marks or names may have been changed.
            </p>
          </div>
        </div>
      </section>
      <section className="card" style={{ margin: "18px 16px 0", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>What you can do</h2>
        <Step n={1}>Ask the candidate for the share link from their YuProof wallet</Step>
        <Step n={2}>Or contact the {word} directly to confirm</Step>
        <p style={{ margin: "4px 0 0", fontSize: 12, color: "#4A5368" }}>
          This check is logged against the original document{r.isSample ? " · Sample data" : ""}
        </p>
      </section>
      <div className="bottom-bar">
        {issuer.contactEmail ? (
          <a
            className="btn btn-s"
            style={{ flex: 1, height: 50 }}
            href={`mailto:${issuer.contactEmail}?subject=${encodeURIComponent(`Document check: ${d.id}`)}`}
          >
            Contact {word}
          </a>
        ) : (
          <Link className="btn btn-s" style={{ flex: 1, height: 50 }} href="/">
            New check
          </Link>
        )}
        <ReportButton label="Report document" className="btn btn-d" style={{ flex: 1.3, height: 50, fontWeight: 800 }} claimedDocId={d.id} hash={hash} />
      </div>
    </>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <p style={{ margin: 0, display: "flex", gap: 10, fontSize: 14, lineHeight: 1.5 }}>
      <span aria-hidden="true" style={{ width: 22, height: 22, flexShrink: 0, borderRadius: 11, background: "#E8EBF8", color: "#2B3990", fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {n}
      </span>
      {children}
    </p>
  );
}

// ---------------------------------------------------------------- Cancelled

function Cancelled({ r }: { r: VerifyResponse }) {
  const d = r.document!;
  const issuer = r.issuer!;
  const cancel = r.cancel!;
  const word = issuer.type === "company" ? "company" : issuer.type === "institute" ? "institute" : "college";
  return (
    <>
      <Hero
        tone="cancelled"
        title="Cancelled"
        subtitle={`The ${word} cancelled this document`}
        chips={[
          issuer.verified ? { label: "Verified issuer", kind: "passed" } : { label: "Issuer not verified", kind: "flag", icon: "warn", colour: "#B45309", text: "#7C4A03" },
          { label: r.checks!.unchanged ? "Unchanged" : "On blockchain", kind: "passed" },
          { label: cancel.at ? `Cancelled ${fmtDate(cancel.at)}` : "Cancelled", kind: "flag", icon: "cancel", colour: "#B45309", text: "#7C4A03" },
        ]}
      />
      <section className="overlap" aria-label="Document">
        <div style={{ height: 6, background: "repeating-linear-gradient(90deg,#B45309 0 10px,#FBF8F1 10px 20px)" }} />
        <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <p className="serif" style={{ margin: 0, fontSize: 19 }}>{d.title}</p>
            <p style={{ margin: "2px 0 0", fontSize: 14, color: "#3D4157" }}>
              {d.holderName} · {issuer.name}
            </p>
          </div>
          <div style={{ padding: "10px 12px", borderRadius: 12, background: "#FFF1D6", display: "flex", flexDirection: "column", gap: 2 }}>
            <p className="lbl" style={{ color: "#7C4A03" }}>Reason given by the {word}</p>
            <p style={{ margin: 0, fontSize: 14, color: "#5C3A06" }}>{cancel.reason ?? "No reason was given."}</p>
          </div>
          {cancel.replacementId && (
            <Link
              href={`/v/${cancel.replacementId}?via=id`}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "10px 12px", borderRadius: 12, background: "#FFFFFF", border: "1px solid #E7E0CF", textDecoration: "none", fontSize: 14, fontWeight: 700 }}
            >
              <span>
                Check the replacement · <span style={{ whiteSpace: "nowrap" }}>{cancel.replacementId}</span>
              </span>
              <Icon name="chevron" size={18} />
            </Link>
          )}
        </div>
      </section>
      <p className="muted" style={{ margin: "16px 20px 0", fontSize: 13, lineHeight: 1.5 }}>
        {r.checks!.unchanged ? "The original file is unchanged, but the" : "The"} {word} no longer stands behind it.{" "}
        {cancel.replacementId ? "Accept only the replacement." : "Don't accept it."}
        {r.isSample ? " · Sample data" : ""}
      </p>
      <div className="bottom-bar">
        <Link href="/" className="btn btn-s" style={{ flex: 1 }}>
          New check
        </Link>
        {cancel.replacementId ? (
          <Link href={`/v/${cancel.replacementId}?via=id`} className="btn btn-p" style={{ flex: 1.3 }}>
            Check replacement
          </Link>
        ) : (
          <a className="btn btn-p" style={{ flex: 1.3 }} href={`/api/proof/${d.id}`} download>
            Download proof
          </a>
        )}
      </div>
    </>
  );
}

// ---------------------------------------------------------------- Not found

const NOT_FOUND_SUB: Record<string, string> = {
  no_match: "No YuProof record for this file",
  unknown_id: "No YuProof record for this document ID",
  not_recorded: "This document isn't recorded on the blockchain yet",
  share_expired: "This share link has expired or was stopped",
};

function NotFound({ r, hash }: { r: VerifyResponse; hash?: string }) {
  const reason = r.reason ?? "no_match";
  return (
    <>
      <Hero
        tone="notfound"
        title="Not found"
        subtitle={NOT_FOUND_SUB[reason] ?? NOT_FOUND_SUB.no_match}
        chips={[
          {
            label:
              reason === "share_expired"
                ? "Link not active"
                : reason === "not_recorded"
                  ? "No blockchain record"
                  : reason === "unknown_id" && r.method !== "upload"
                    ? "No matching document ID"
                    : "No matching fingerprint",
            kind: "flag",
            icon: "search",
            colour: "#3D4560",
            text: "#3D4560",
          },
        ]}
      />
      <main style={{ position: "relative", margin: "-56px 16px 0", display: "flex", flexDirection: "column", gap: 12 }}>
        <section className="card" style={{ boxShadow: "0 16px 40px rgba(20,26,61,0.14)", display: "flex", flexDirection: "column", gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>This can mean</h2>
          {reason === "share_expired" ? (
            <Meaning>Ask the holder for a new share link from their YuProof wallet.</Meaning>
          ) : reason === "not_recorded" ? (
            <Meaning>The issuer is still recording this batch. Try again in a few minutes, or check with the issuer.</Meaning>
          ) : (
            <>
              <Meaning>The document was not issued through YuProof. Check it with the issuer directly.</Meaning>
              <Meaning>It is a scan or photo of the original. Ask for the original PDF or the share link.</Meaning>
              <Meaning>It is a fake made to look like a YuProof document.</Meaning>
            </>
          )}
        </section>
        <IssuerSearch />
      </main>
      <div className="bottom-bar">
        <Link href="/" className="btn btn-s" style={{ flex: 1 }}>
          Try another file
        </Link>
        <ReportButton label="Report as suspicious" className="btn btn-p" style={{ flex: 1.3 }} hash={hash} />
      </div>
    </>
  );
}

function Meaning({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ margin: 0, display: "flex", gap: 10, fontSize: 14, lineHeight: 1.5 }}>
      <Icon name="chevron" size={18} stroke="#2B3990" />
      <span>{children}</span>
    </p>
  );
}

// ------------------------------------------------------------------- Switch

/** Renders one of the four result screens for a verification response. */
export function ResultView({ result, hash }: { result: VerifyResponse; hash?: string }) {
  switch (result.result) {
    case "genuine":
      return <Genuine r={result} />;
    case "tampered":
      return <Tampered r={result} hash={hash} />;
    case "cancelled":
      return <Cancelled r={result} />;
    default:
      return <NotFound r={result} hash={hash} />;
  }
}
