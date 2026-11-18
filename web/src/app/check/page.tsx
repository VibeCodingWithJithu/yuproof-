import type { Metadata } from "next";
import { CheckFlow } from "./CheckFlow";

export const metadata: Metadata = { title: "Checking" };

export default function CheckPage() {
  return <CheckFlow />;
}
