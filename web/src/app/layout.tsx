import type { Metadata, Viewport } from "next";
import { Fraunces, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], weight: ["600"] });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"], weight: ["500", "700"] });

export const metadata: Metadata = {
  title: { default: "YuProof · Is this certificate real?", template: "%s · YuProof" },
  description:
    "Check a YuProof degree, mark sheet or experience letter in seconds. Scan the QR code or upload the PDF. No login.",
  icons: { icon: "/brand/favicon-64.png", apple: "/brand/yuproof-app-icon-blue.svg" },
  robots: { index: false },
};

export const viewport: Viewport = { themeColor: "#2B3990", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${jakarta.variable} ${fraunces.variable} ${jetbrains.variable}`}>
      <body>{children}</body>
    </html>
  );
}
