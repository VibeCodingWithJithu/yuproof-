const IST = "Asia/Kolkata";

/** 12 Jun 2026 */
export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: IST });

/** 12 Jun */
export const fmtDay = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: IST });

export const initials = (name: string) =>
  name
    .replace(/[^\p{L}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0 && !/^(of|and|the|for)$/i.test(w))
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

/** 7f3a…c91e */
export const shortHash = (h: string) => `${h.slice(2, 6)}…${h.slice(-4)}`;

/** 7f3a 91c2 0be4 … c91e */
export const groupedHash = (h: string) => `${h.slice(2, 6)} ${h.slice(6, 10)} ${h.slice(10, 14)} … ${h.slice(-4)}`;
