// Line icons copied from screens/html (24×24, stroke = currentColor unless given).
const PATHS = {
  scan: "M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10",
  upload: "M12 15V3M7 8l5-5 5 5M5 21h14",
  lock: "M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6",
  back: "M15 6l-6 6 6 6",
  close: "M7 7l10 10M17 7L7 17",
  check: "M5 12l5 5 9-10",
  chevron: "M9 6l6 6-6 6",
  warn: "M12 9v4M12 17h.01M10.3 3.9L2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z",
  cancel: "M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M5.6 5.6l12.8 12.8",
  search: "M11 4a7 7 0 1 0 0 14a7 7 0 1 0 0-14M20 20l-4-4",
  torch: "M9 2h6l-1 7h3l-6 13 1-9H8z",
  download: "M12 3v12M7 10l5 5 5-5M5 21h14",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({
  name,
  size = 20,
  stroke = "currentColor",
  width = 2,
  className,
  style,
}: {
  name: IconName;
  size?: number;
  stroke?: string;
  width?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      style={{ flexShrink: 0, ...style }}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
