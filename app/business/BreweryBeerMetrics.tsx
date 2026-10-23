import BeerColorGlass from "@/app/components/BeerColorGlass";
import BitternessMeter from "@/app/components/BitternessMeter";

export default function BreweryBeerMetrics({
  ebc,
  ibu,
  compact = false,
}: {
  ebc: number | null;
  ibu: number | null;
  compact?: boolean;
}) {
  const color = ebc == null || !Number.isFinite(Number(ebc)) ? null : Number(ebc);
  const bitterness = ibu == null || !Number.isFinite(Number(ibu)) ? null : Number(ibu);
  if (color === null && bitterness === null) return null;

  return (
    <dl className={`grid grid-cols-2 gap-3 ${compact ? "mt-3" : "mx-auto my-6 max-w-xl"}`}>
      {color !== null && (
        <div className={`flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.04] ${compact ? "p-2" : "p-4"}`}>
          <BeerColorGlass ebc={color} compact={compact} />
          <div>
            <dt className="text-xs text-white/55">Color</dt>
            <dd className="mt-0.5 font-semibold text-white">
              {color.toLocaleString()} EBC
            </dd>
          </div>
        </div>
      )}
      {bitterness !== null && (
        <div className={`rounded-lg border border-white/10 bg-white/[0.04] ${compact ? "p-2" : "p-4"}`}>
          <dt className="mb-2 text-xs text-white/55">Bitterness</dt>
          <dd><BitternessMeter ibu={bitterness} /></dd>
        </div>
      )}
    </dl>
  );
}
