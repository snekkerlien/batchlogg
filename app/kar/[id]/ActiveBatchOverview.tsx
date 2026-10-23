"use client";

import type { ReactNode } from "react";
import type { Batch } from "@/app/types/batchTypes";
import { Qty } from "@/app/components/Units";
import BeerColorGlass from "@/app/components/BeerColorGlass";
import BitternessMeter from "@/app/components/BitternessMeter";

type ActiveBatchOverviewProps = {
  batch: Batch & { batchnummer?: string | number };
  secondary?: boolean;
};

function daysSince(date: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 86400000));
}

function Metric({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
      <dt className="text-xs font-medium uppercase tracking-wide text-white/50">{label}</dt>
      <dd className="mt-1 font-semibold text-white">{children}</dd>
    </div>
  );
}

export default function ActiveBatchOverview({
  batch,
  secondary = false,
}: ActiveBatchOverviewProps) {
  const startDate = new Date(batch.startdato);
  const age = daysSince(batch.startdato);

  return (
    <section aria-label="Batch overview" className="mb-5">
      <h3 className="mb-3 text-lg font-semibold text-green-300">Batch at a glance</h3>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {batch.batchnummer != null && <Metric label="Batch ID">{batch.batchnummer}</Metric>}
        <Metric label="Started">
          {startDate.toLocaleDateString("en-US")}
          <span className="block text-xs font-normal text-white/55">
            {age} {age === 1 ? "day" : "days"} ago
          </span>
        </Metric>
        <Metric label="Batch volume"><Qty kind="volume" value={batch.volume_l} /></Metric>
        <Metric label="Original gravity">{Number(batch.og).toFixed(3)}</Metric>
        {batch.type === "Beer" && batch.beer_style && (
          <Metric label="Beer style">{batch.beer_style}</Metric>
        )}
        <Metric label="Fermentation stage">
          {batch.status === "Conditioning"
            ? "Conditioning"
            : secondary
              ? "Secondary fermentation"
              : "Primary fermentation"}
        </Metric>
        {(batch.type === "Beer" || batch.type === "Braggot") && batch.ibu != null && (
          <Metric label="Bitterness"><BitternessMeter ibu={Number(batch.ibu)} /></Metric>
        )}
        {(batch.type === "Beer" || batch.type === "Braggot") && batch.ebc != null && (
          <Metric label="Color">
            <span className="flex min-h-[5.5rem] items-start">
              <span className="flex items-baseline gap-1.5">
                <span className="text-xl font-bold leading-none tracking-tight text-white">
                  {Number(batch.ebc).toFixed(0)}
                </span>
                <span className="text-xs font-medium text-white/50">EBC</span>
              </span>
              <span className="flex flex-1 items-center justify-center">
                <BeerColorGlass ebc={Number(batch.ebc)} />
              </span>
            </span>
          </Metric>
        )}
      </dl>
      {(batch.type === "Beer" || batch.type === "Braggot") && batch.ibu != null && (
        <p className="mt-3 text-xs text-white/45">
          Bitterness is a guide; sweetness and style affect perception.
        </p>
      )}
    </section>
  );
}
