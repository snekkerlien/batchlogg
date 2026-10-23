import { UnitInput, UnitSymbol } from "./Units";
import FormField from "./FormField";

export default function BaseLiquidField({
  defaultName = "",
  defaultAmount = "",
}: {
  defaultName?: string;
  defaultAmount?: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <FormField
        id="recipe-base-liquid"
        label={<>Base liquid (<UnitSymbol kind="volume" />)</>}
      >
        <input
          id="recipe-base-liquid"
          name="base_liquid"
          defaultValue={defaultName}
          placeholder="Water (leave empty for plain water)"
          className="w-full min-w-0 rounded border border-white/20 bg-black/40 p-3 focus:border-green-400 focus:outline-none"
        />
      </FormField>
      <span className="mt-8 shrink-0 text-sm text-white/80">up to</span>
      <FormField id="recipe-base-liquid-amount" label="Amount">
        <UnitInput
          id="recipe-base-liquid-amount"
          name="base_liquid_amount"
          kind="volume"
          defaultValue={defaultAmount}
          placeholder="Amount"
          className="w-28 shrink-0 rounded border border-white/20 bg-black/40 p-3 focus:border-green-400 focus:outline-none"
        />
      </FormField>
    </div>
  );
}
