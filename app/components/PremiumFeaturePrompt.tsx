import Link from "next/link";

export default function PremiumFeaturePrompt({
  feature,
  description,
  benefits,
}: {
  feature: string;
  description: string;
  benefits: string[];
}) {
  return (
    <aside className="rounded-xl border border-green-400/25 bg-green-950/25 p-5 text-left">
      <p className="text-xs font-semibold uppercase tracking-wide text-green-200/70">
        Premium feature
      </p>
      <h2 className="mt-1 text-lg font-semibold text-green-100">
        {feature} is included with Premium
      </h2>
      <p className="mt-2 text-sm leading-6 text-white/75">{description}</p>
      <ul className="mt-3 space-y-1 text-sm text-white/70">
        {benefits.map((benefit) => (
          <li key={benefit}>• {benefit}</li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Link
          href="/premium"
          className="rounded-lg border border-green-300/30 bg-green-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-600"
        >
          See Premium plan
        </Link>
        <span className="text-sm text-white/70">
          $4.99 USD/month, before applicable VAT
        </span>
      </div>
      <p className="mt-2 text-xs text-white/50">
        Applicable VAT is calculated at checkout; you’ll see the final total before payment.
      </p>
    </aside>
  );
}
