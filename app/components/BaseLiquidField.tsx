import { UnitInput, UnitSymbol } from "./Units";

export default function BaseLiquidField({
  defaultName = "",
  defaultAmount = "",
}: {
  defaultName?: string;
  defaultAmount?: string;
}) {
  return (
    <div>
      <label className="block mb-1 font-semibold">
        Base liquid (<UnitSymbol kind="volume" />)
      </label>
      <div className="flex items-center gap-2">
        <input
          name="base_liquid"
          defaultValue={defaultName}
          placeholder="Water (leave empty for plain water)"
          className="min-w-0 flex-1 rounded border border-white/20 bg-black/40 p-3"
        />
        <span className="shrink-0 text-sm text-white/80">up to</span>
        <UnitInput
          name="base_liquid_amount"
          kind="volume"
          defaultValue={defaultAmount}
          placeholder="Amount"
          className="w-28 shrink-0 rounded border border-white/20 bg-black/40 p-3"
        />
      </div>
    </div>
  );
}
