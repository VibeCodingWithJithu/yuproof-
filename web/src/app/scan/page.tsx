import type { Metadata } from "next";
import { Scanner } from "./Scanner";

export const metadata: Metadata = { title: "Scan the QR code" };

export default function ScanPage() {
  return <Scanner />;
}
