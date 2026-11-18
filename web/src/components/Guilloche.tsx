/** Thin concentric circles behind coloured headers (spec §1 signature element 2). */
export function Guilloche({ stroke, cy = 170 }: { stroke: string; cy?: number }) {
  return (
    <svg className="guilloche" width="600" height="420" viewBox="0 0 600 420" aria-hidden="true">
      <g fill="none" stroke={stroke} strokeWidth="1">
        {[90, 112, 134, 156, 178, 200, 222, 244, 266].map((r) => (
          <circle key={r} cx="300" cy={cy} r={r} />
        ))}
      </g>
    </svg>
  );
}
