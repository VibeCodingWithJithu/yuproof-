import { headers } from "next/headers";
import Link from "next/link";
import type { VerifyResponse } from "@/lib/types";
import { CheckingView, type CheckStep } from "./CheckingView";
import { ResultView } from "./ResultView";

/** Static Checking screen shown while a QR / ID / share-link result streams in. */
export function CheckingFallback({ label }: { label: string }) {
  const steps: CheckStep[] = [
    { title: "Reading the code", detail: label, mono: true, state: "done" },
    { title: "Finding the document record", state: "done" },
    { title: "Comparing with the blockchain record", detail: "Polygon · searching…", mono: true, state: "active" },
    { title: "Checking the issuer", state: "pending" },
  ];
  return <CheckingView steps={steps} />;
}

export async function countryFromHeaders() {
  const h = await headers();
  return h.get("x-vercel-ip-country") ?? h.get("cf-ipcountry");
}

/** Renders a result, or a friendly error when the chain/database can't be reached. */
export async function ResultOrError({ load }: { load: () => Promise<VerifyResponse> }) {
  let result: VerifyResponse;
  try {
    result = await load();
  } catch (err) {
    console.error("[yuproof]", err);
    return (
      <div className="phone" style={{ justifyContent: "center", padding: 20, gap: 16, textAlign: "center" }}>
        <h1 className="serif" style={{ margin: 0, fontSize: 26 }}>
          Couldn&apos;t finish the check
        </h1>
        <p className="muted" role="alert" style={{ margin: 0, fontSize: 14 }}>
          We couldn&apos;t reach the record right now. Please try again in a moment.
        </p>
        <Link href="/" className="btn btn-p">
          New check
        </Link>
      </div>
    );
  }
  return (
    <div className="phone">
      <ResultView result={result} />
    </div>
  );
}
