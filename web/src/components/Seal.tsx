import { useId } from "react";

export type SealVariant = "verified" | "tampered" | "cancelled" | "notfound" | "vote";

const VARIANTS: Record<
  SealVariant,
  { ring: string; fill: string; inner: string; innerOpacity: number; ink: string; text: string; size: number; spacing: number; label: string; mark: React.ReactNode }
> = {
  verified: {
    ring: "#34D399", fill: "#0E9F6E", inner: "#FFFFFF", innerOpacity: 0.6, ink: "#FFFFFF",
    text: "VERIFIED · YUPROOF · VERIFIED · YUPROOF ·", size: 9.5, spacing: 3.2, label: "Verified seal",
    mark: <path d="M58 76 L70 88 L93 62" fill="none" stroke="#FFFFFF" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />,
  },
  tampered: {
    ring: "#FFB4AB", fill: "#FFFFFF", inner: "#B42318", innerOpacity: 0.5, ink: "#B42318",
    text: "NOT VERIFIED · DO NOT ACCEPT · NOT VERIFIED ·", size: 9.5, spacing: 2.6, label: "Not verified seal",
    mark: <path d="M61 61 L89 89 M89 61 L61 89" fill="none" stroke="#B42318" strokeWidth="7" strokeLinecap="round" />,
  },
  cancelled: {
    ring: "#FCD9A8", fill: "#FFFFFF", inner: "#B45309", innerOpacity: 0.5, ink: "#B45309",
    text: "CANCELLED BY ISSUER · CANCELLED BY ISSUER ·", size: 9, spacing: 2.4, label: "Cancelled seal",
    mark: <path d="M58 75 H92" fill="none" stroke="#B45309" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />,
  },
  notfound: {
    ring: "#C9D0E3", fill: "#FFFFFF", inner: "#3D4560", innerOpacity: 0.5, ink: "#3D4560",
    text: "NOT FOUND · NOT ISSUED ON YUPROOF · NOT FOUND ·", size: 9, spacing: 2.4, label: "Not found seal",
    mark: <path d="M66 64a9 9 0 1 1 13 8c-3 2-4 3-4 7M75 88h.01" fill="none" stroke="#3D4560" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />,
  },
  vote: {
    ring: "#34D399", fill: "#0E9F6E", inner: "#FFFFFF", innerOpacity: 0.6, ink: "#FFFFFF",
    text: "VOTE RECORDED · YUPROOF · VOTE RECORDED ·", size: 9, spacing: 2.6, label: "Vote recorded seal",
    mark: <path d="M58 76 L70 88 L93 62" fill="none" stroke="#FFFFFF" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />,
  },
};

/** The round YuProof stamp (spec §1 signature element 1). */
export function Seal({ variant, size = 118 }: { variant: SealVariant; size?: number }) {
  const v = VARIANTS[variant];
  const arcId = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 150 150" role="img" aria-label={v.label}>
      <defs>
        <path id={arcId} d="M75 75 m-56 0 a56 56 0 1 1 112 0 a56 56 0 1 1 -112 0" />
      </defs>
      <circle cx="75" cy="75" r="72" fill="none" stroke={v.ring} strokeWidth="2" strokeDasharray="2 4" />
      <circle cx="75" cy="75" r="66" fill={v.fill} />
      <circle cx="75" cy="75" r="44" fill="none" stroke={v.inner} strokeWidth="1.2" opacity={v.innerOpacity} />
      <text fontFamily="var(--font-jakarta), sans-serif" fontSize={v.size} fontWeight="700" letterSpacing={v.spacing} fill={v.ink}>
        <textPath href={`#${arcId}`}>{v.text}</textPath>
      </text>
      {v.mark}
    </svg>
  );
}
