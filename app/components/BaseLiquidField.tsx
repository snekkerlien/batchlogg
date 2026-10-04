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
      <div className="flex gap-2">
        <input
          name="base_liquid"
          defaultValue={defaultName}
          placeholder="Water (leave empty for plain water)"
          className="flex-1 p-3 rounded bg-black/40 border border-white/20"
        />
        <UnitInput
          name="base_liquid_amount"
          kind="volume"
          defaultValue={defaultAmount}
          placeholder="Amount"
          className="w-28 p-3 rounded bg-black/40 border border-white/20"
        />
      </div>
    </div>
  );
}
