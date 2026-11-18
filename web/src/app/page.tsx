import { Guilloche } from "@/components/Guilloche";
import { DocIdForm, HeroActions, LanguageSwitch } from "@/components/HomeActions";
import { Icon } from "@/components/Icon";

const STEPS: [string, string][] = [
  ["Every document has a fingerprint", "recorded on a public blockchain by the college or company."],
  ["We recalculate it from your file", "and compare the two."],
  ["Change one mark or letter", "and they no longer match."],
];

/** Main: "Is this certificate real?" (screens/html/Main.html) */
export default function Home() {
  return (
    <div className="phone">
      <section className="hero" style={{ background: "#2B3990", padding: "18px 20px 30px", gap: 22 }}>
        <Guilloche stroke="#3A49A8" cy={260} />
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 2 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/yuproof-logo-horizontal-white.svg" alt="YuProof" style={{ height: 28, width: "auto" }} />
          <LanguageSwitch />
        </div>
        <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 10 }}>
          <p className="lbl" style={{ color: "#9FF0CB" }}>
            Free document check
          </p>
          <h1 className="serif" style={{ margin: 0, fontSize: 38, lineHeight: 1.05, color: "#FFFFFF" }}>
            Is this certificate real?
          </h1>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: "#DDE2F5" }}>
            Check any YuProof degree, mark sheet or experience letter in seconds.
          </p>
        </div>
        <HeroActions />
      </section>

      <main style={{ display: "flex", flexDirection: "column", gap: 16, padding: 20 }}>
        <DocIdForm />
        <section className="card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>How it works</h2>
          <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 14 }}>
            {STEPS.map(([strong, rest], i) => (
              <li key={strong} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <span aria-hidden="true" style={{ width: 28, height: 28, flexShrink: 0, borderRadius: 14, background: "#E8EBF8", color: "#2B3990", fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {i + 1}
                </span>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
                  <strong>{strong}</strong> <span className="muted">{rest}</span>
                </p>
              </li>
            ))}
          </ol>
        </section>
        <div className="muted" style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap", fontSize: 13, fontWeight: 600 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="lock" size={15} />
            No login
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="eye" size={15} />
            We don&apos;t keep your file
          </span>
        </div>
        <a
          href="https://yubhiantechnologies.in/products/yuproof"
          style={{ marginTop: 4, textAlign: "center", fontSize: 14, fontWeight: 700 }}
        >
          Issue documents? YuProof for colleges and companies →
        </a>
      </main>
    </div>
  );
}
