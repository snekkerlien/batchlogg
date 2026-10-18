export default function BitternessMeter({ ibu }: { ibu: number }) {
  const value = Number.isFinite(ibu) ? Math.round(ibu) : 0;
  const position = Math.min(100, Math.max(0, value));

  return (
    <div
      role="meter"
      aria-label={`Bitterness guide, ${value} IBU on a 0 to 100 scale`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={position}
      className="space-y-2"
    >
      <div className="flex items-baseline justify-between gap-2">
        <span>{value} IBU</span>
        <span className="text-xs font-normal text-white/50">guide</span>
      </div>
      <div className="relative h-2 rounded-full bg-white/15">
        <span
          aria-hidden="true"
          className="absolute top-1/2 h-4 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-green-300 shadow-[0_0_8px_var(--user-accent)]"
          style={{ left: `${position}%` }}
        />
      </div>
      <div className="flex justify-between text-xs font-normal text-white/50">
        <span>Mild</span>
        <span>Bitter</span>
      </div>
    </div>
  );
}
