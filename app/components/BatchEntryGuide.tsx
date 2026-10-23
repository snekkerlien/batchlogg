import Link from "next/link";
import { UnitSymbol } from "@/app/components/Units";

export default function BatchEntryGuide({
  vesselId,
  recipeName,
}: {
  vesselId: string;
  recipeName?: string | null;
}) {
  return (
    <aside className="mb-6 rounded-xl border border-green-300/20 bg-green-300/[0.05] p-4">
      <h2 className="font-semibold text-green-200">A few quick pointers</h2>
      <ul className="mt-2 space-y-2 text-sm text-white/75">
        <li>
          <strong>Volume:</strong> Enter the total batch volume in the unit shown,
          for example 10 <UnitSymbol kind="volume" />.
        </li>
        <li>
          <strong>Original Gravity (OG):</strong> Record the specific gravity before
          fermentation begins, for example 1.050. Your recipe may have a different target.
        </li>
        <li>
          <strong>Start date:</strong> Choose the date you brewed or began fermenting
          this batch. Change it if you started earlier than today.
        </li>
      </ul>
      {recipeName && (
        <p className="mt-3 text-sm text-green-100">
          Starting from <strong>{recipeName}</strong>? Its saved recipe details are
          prefilled and can still be edited.
        </p>
      )}
      <p className="mt-3 text-sm text-white/75">
        Have a saved recipe?{" "}
        <Link
          href={`/my-recipes?vessel=${encodeURIComponent(vesselId)}`}
          className="font-semibold text-green-200 underline underline-offset-4"
        >
          Start from a saved recipe
        </Link>
        {" "}to prefill its details for this vessel.
      </p>
    </aside>
  );
}
