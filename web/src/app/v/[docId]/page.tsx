import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { CheckingFallback, countryFromHeaders, ResultOrError } from "@/components/ServerResult";
import { normalizeDocId } from "@/lib/types";
import { verifyDocId } from "@/lib/verify";

export const metadata: Metadata = { title: "Document check" };

/**
 * /v/[docId] — the URL inside every document's QR code. Also used for typed IDs (?via=id).
 * Shows Final-Genuine, VerifyCancelled or VerifyNotFound.
 */
export default function VerifyDocPage(props: PageProps<"/v/[docId]">) {
  return (
    <Suspense fallback={<CheckingFallback label="YuProof document code" />}>
      <Result {...props} />
    </Suspense>
  );
}

async function Result({ params, searchParams }: PageProps<"/v/[docId]">) {
  await connection(); // results are always computed at request time
  const { docId } = await params;
  const { via } = await searchParams;
  const method = via === "id" ? "id" : "qr";
  const id = normalizeDocId(decodeURIComponent(docId));
  return (
    <ResultOrError
      load={async () =>
        id
          ? verifyDocId(id, { method, ipCountry: await countryFromHeaders() })
          : { result: "not_found", reason: "unknown_id", method, checkedAt: new Date().toISOString() }
      }
    />
  );
}
