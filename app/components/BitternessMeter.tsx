export default function BitternessMeter({ ibu }: { ibu: number }) {
  const value = Number.isFinite(ibu) ? Math.round(ibu) : 0;
  const position = Math.min(120, Math.max(0, value));
  const level =
    value <= 30 ? "Mild" : value <= 60 ? "Bitter" : "Extra Bitter";
  const levelStyles =
    level === "Mild"
      ? "text-[#bbf7d0]/75"
      : level === "Bitter"
        ? "text-amber-200/75"
        : "text-orange-200/75";

  return (
    <div
      role="meter"
      aria-label="Bitterness guide"
      aria-valuemin={0}
      aria-valuemax={120}
      aria-valuenow={position}
      aria-valuetext={`${value} IBU, ${level}`}
      className="space-y-2"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-baseline gap-1.5">
          <span className="text-xl font-bold leading-none tracking-tight text-white">
            {value}
          </span>
          <span className="text-xs font-medium text-white/50">IBU</span>
        </span>
        <span
          className={`text-[10px] font-medium leading-tight ${levelStyles}`}
        >
          {level}
        </span>
      </div>
      <div className="px-1 py-0.5">
        <div className="relative h-1.5">
          <div
            aria-hidden="true"
            className="absolute inset-0 flex overflow-hidden rounded-full bg-white/10"
          >
            <span className="h-full w-1/4 bg-[#4ade80]/55" />
            <span className="h-full w-1/4 bg-amber-300/55" />
            <span className="h-full w-1/2 bg-orange-400/55" />
            <span className="absolute inset-y-0 left-1/4 w-px bg-black/25" />
            <span className="absolute inset-y-0 left-1/2 w-px bg-black/25" />
          </div>
          <span
            aria-hidden="true"
            className="absolute top-1/2 z-10 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/90 bg-zinc-950"
            style={{ left: `${(position / 120) * 100}%` }}
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1 text-center text-[9px] font-normal leading-tight">
        <span className="text-white/65">
          <span className="block">Mild</span>
          <span className="mt-0.5 block text-white/40">0–30 IBU</span>
        </span>
        <span className="text-white/65">
          <span className="block">Bitter</span>
          <span className="mt-0.5 block text-white/40">30–60 IBU</span>
        </span>
        <span className="text-white/65">
          <span className="block">Extra Bitter</span>
          <span className="mt-0.5 block text-white/40">60–120 IBU</span>
        </span>
      </div>
    </div>
  );
}
