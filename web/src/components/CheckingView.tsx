import Link from "next/link";
import { Icon } from "./Icon";

export interface CheckStep {
  title: string;
  detail?: string;
  mono?: boolean;
  state: "done" | "active" | "pending";
}

/** VerifyChecking screen: progress ring + the four steps. */
export function CheckingView({ steps, error, onRetry }: { steps: CheckStep[]; error?: string | null; onRetry?: () => void }) {
  const done = steps.filter((s) => s.state === "done").length;
  const C = 326.7;
  const offset = C * (1 - Math.max(0.08, (done + 0.4) / steps.length));
  return (
    <div className="phone">
      <header style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 12px", background: "#FFFFFF", borderBottom: "1px solid #E4E8F3" }}>
        <Link href="/" aria-label="Back" style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", color: "#141A3D" }}>
          <Icon name="back" size={22} width={2.2} />
        </Link>
        <h1 style={{ margin: 0, flexGrow: 1, fontSize: 17, fontWeight: 700 }}>Checking</h1>
      </header>
      <main style={{ flexGrow: 1, display: "flex", flexDirection: "column", gap: 20, padding: "28px 20px" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, textAlign: "center" }}>
          <div style={{ position: "relative", width: 120, height: 120 }}>
            <svg width="120" height="120" viewBox="0 0 120 120" aria-hidden="true">
              <circle cx="60" cy="60" r="52" fill="none" stroke="#E4E8F3" strokeWidth="10" />
              <circle
                cx="60" cy="60" r="52" fill="none" stroke="#2B3990" strokeWidth="10" strokeLinecap="round"
                strokeDasharray={C} strokeDashoffset={error ? C : offset} transform="rotate(-90 60 60)"
                style={{ transition: "stroke-dashoffset .4s ease" }}
              />
            </svg>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/yuproof-mark.svg" alt="" style={{ position: "absolute", left: 34, top: 34, width: 52, height: 52 }} />
          </div>
          <h2 className="serif" style={{ margin: 0, fontSize: 26 }}>
            {error ? "Couldn't finish the check" : "Checking your document"}
          </h2>
          <p className="muted" style={{ margin: 0, fontSize: 14 }} role={error ? "alert" : undefined}>
            {error ?? "This usually takes 2 to 3 seconds."}
          </p>
          {error && onRetry && (
            <button type="button" className="btn btn-p" onClick={onRetry}>
              Try again
            </button>
          )}
        </div>
        <ol className="card" style={{ margin: 0, padding: "6px 18px", listStyle: "none" }} aria-live="polite">
          {steps.map((s) => (
            <li key={s.title} style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "12px 0" }}>
              {s.state === "done" ? (
                <span style={{ width: 30, height: 30, flexShrink: 0, borderRadius: 15, background: "#0E9F6E", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name="check" size={16} stroke="#FFFFFF" width={3} />
                </span>
              ) : s.state === "active" && !error ? (
                <span className="spin" style={{ width: 30, height: 30, flexShrink: 0, borderRadius: 15, border: "3px solid #DDE2F5", borderTopColor: "#2B3990", boxSizing: "border-box" }} />
              ) : (
                <span style={{ width: 30, height: 30, flexShrink: 0, borderRadius: 15, border: "2px solid #C9D0E3", boxSizing: "border-box" }} />
              )}
              <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                <span style={{ fontSize: 15, fontWeight: s.state === "active" ? 800 : 600, color: s.state === "pending" ? "#4A5368" : "#141A3D" }}>
                  {s.title}
                  {s.state === "done" && <span className="sr"> (done)</span>}
                </span>
                {s.detail && (
                  <span className={s.mono ? "mono" : undefined} style={{ fontSize: 12, color: "#4A5368", overflowWrap: "anywhere" }}>
                    {s.detail}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ol>
        <p className="muted" style={{ margin: "auto 0 0", textAlign: "center", fontSize: 12 }}>
          Your file stays on your device. Only its fingerprint is compared.
        </p>
      </main>
    </div>
  );
}
