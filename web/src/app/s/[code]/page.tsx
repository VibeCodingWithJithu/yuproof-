import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { CheckingFallback, countryFromHeaders, ResultOrError } from "@/components/ServerResult";
import { verifyShareCode } from "@/lib/verify";

export const metadata: Metadata = { title: "Shared document" };

/** /s/[code] — a share link from the holder's wallet opens the result for that one document. */
export default function SharePage(props: PageProps<"/s/[code]">) {
  return (
    <Suspense fallback={<CheckingFallback label="Share link" />}>
      <Result {...props} />
    </Suspense>
  );
}

async function Result({ params }: PageProps<"/s/[code]">) {
  await connection(); // results are always computed at request time
  const { code } = await params;
  const valid = /^[A-Za-z0-9_-]{6,64}$/.test(code);
  return (
    <ResultOrError
      load={async () =>
        valid
          ? verifyShareCode(code, { method: "link", ipCountry: await countryFromHeaders() })
          : { result: "not_found", reason: "unknown_id", method: "link", checkedAt: new Date().toISOString() }
      }
    />
  );
}
