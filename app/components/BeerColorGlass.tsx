function ebcToHex(ebc: number): string {
  if (!Number.isFinite(ebc) || ebc <= 0) return "#F3F3F3";
  const srm = ebc / 1.97;
  const channels = [
    255 * Math.pow(0.975, srm),
    245 * Math.pow(0.88, srm),
    220 * Math.pow(0.7, srm),
  ];
  return `#${channels
    .map((value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0"))
    .join("")}`;
}

export default function BeerColorGlass({
  ebc,
  compact = false,
}: {
  ebc: number;
  compact?: boolean;
}) {
  const color = ebcToHex(ebc);

  return (
    <svg
      role="img"
      aria-label={`${Math.round(ebc)} EBC beer color`}
      viewBox="0 0 48 64"
      className={compact ? "h-5 w-4 shrink-0" : "h-12 w-9 shrink-0"}
    >
      <path
        d="M9 5h30l-4.5 52.5a3 3 0 0 1-3 2.7h-15a3 3 0 0 1-3-2.7L9 5Z"
        fill="rgb(255 255 255 / 5%)"
        stroke="rgb(255 255 255 / 75%)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M12 23h24l-2.8 32H14.8L12 23Z"
        fill={color}
        stroke="rgb(255 255 255 / 18%)"
        strokeWidth="0.75"
        strokeLinejoin="round"
      />
      <path
        d="M12 23c1.4-3.1 3.2-3.1 4.7 0 1.4-4.2 3.6-4.2 5 0 1.5-3.4 3.4-3.4 4.8 0 1.4-3.5 3.5-3.5 5 0 1.3-2.5 2.5-2.6 4.5 0v3H12v-3Z"
        fill="rgb(255 255 255 / 90%)"
      />
      <path
        d="m13 9 3.7 42"
        stroke="rgb(255 255 255 / 35%)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M17 57h14"
        stroke="rgb(255 255 255 / 55%)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
