"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { Qty, UnitInput, UnitSymbol } from "@/app/components/Units";
import ExpandArrowButton from "@/app/components/ExpandArrowButton";

type VesselOption = {
  id: string;
  nummer: number | null;
  isCurrent: boolean;
};

type Allocation = {
  vesselId: string;
  volumeL: string;
};

type SplitBatchPanelProps = {
  batch: {
    id: string;
    name: string;
    volume_l: number | string;
  };
  vessels: VesselOption[];
};

function initialAllocations(volume: number): Allocation[] {
  const firstVolume = Number((volume / 2).toFixed(4));
  return [
    { vesselId: "", volumeL: firstVolume.toFixed(4) },
    { vesselId: "", volumeL: (volume - firstVolume).toFixed(4) },
  ];
}

export default function SplitBatchPanel({
  batch,
  vessels,
}: SplitBatchPanelProps) {
  const sourceVolume = Number(batch.volume_l);
  const [open, setOpen] = useState(false);
  const [allocations, setAllocations] = useState(() =>
    initialAllocations(sourceVolume)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [children, setChildren] = useState<
    { id: string; batchnummer: string }[] | null
  >(null);

  const totalVolume = useMemo(
    () =>
      allocations.reduce((total, allocation) => {
        const volume = Number(allocation.volumeL);
        return total + (Number.isFinite(volume) ? volume : 0);
      }, 0),
    [allocations]
  );
  const remainingVolume = sourceVolume - totalVolume;
  const transferLoss = Math.max(0, Number(remainingVolume.toFixed(4)));
  const selectedVessels = allocations
    .map((allocation) => allocation.vesselId)
    .filter(Boolean);
  const isValid =
    Number.isFinite(sourceVolume) &&
    sourceVolume > 0 &&
    allocations.length >= 2 &&
    allocations.every(
      (allocation) =>
        allocation.vesselId &&
        Number.isFinite(Number(allocation.volumeL)) &&
        Number(allocation.volumeL) > 0 &&
        /^\d+(?:\.\d{1,4})?$/.test(allocation.volumeL)
    ) &&
    new Set(selectedVessels).size === allocations.length &&
    remainingVolume >= -0.00005;

  function updateAllocation(index: number, update: Partial<Allocation>) {
    setAllocations((current) =>
      current.map((allocation, rowIndex) =>
        rowIndex === index ? { ...allocation, ...update } : allocation
      )
    );
    setError("");
  }

  async function submitSplit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isValid) return;

    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/batches/${encodeURIComponent(batch.id)}/split`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          allocations: allocations.map((allocation) => ({
            vesselId: allocation.vesselId,
            volumeL: Number(allocation.volumeL),
          })),
        }),
      });
      const result: {
        error?: string;
        children?: { id: string; batchnummer: string }[];
      } = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Could not split this batch.");
      }
      setChildren(result.children ?? []);
    } catch (splitError) {
      console.error("Could not split batch", splitError);
      setError(
        splitError instanceof Error
          ? splitError.message
          : "Could not split this batch. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-6 rounded-lg border border-white/10 bg-white/5 p-4">
      <div className="flex w-full items-center justify-between gap-3 font-semibold text-green-300">
        <h2 className="text-lg">Split into multiple vessels</h2>
        <ExpandArrowButton
          expanded={open}
          label="split into multiple vessels"
          controls="split-batch-content"
          onClick={() => setOpen((value) => !value)}
        />
      </div>

      <div
        id="split-batch-content"
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
          open ? "[grid-template-rows:1fr]" : "[grid-template-rows:0fr]"
        }`}
      >
        <div className="overflow-hidden">
          {children ? (
            <div className="mt-4 rounded-lg border border-green-400/20 bg-green-950/30 p-4">
              <p role="status" className="font-semibold text-green-200">
                Batch split into {children.length} batches.
              </p>
              <p className="mt-1 text-sm text-white/75">
                Transfer loss recorded:{" "}
                <Qty kind="volume" value={transferLoss} maxDecimals={3} />
              </p>
              <ul className="mt-2 space-y-1 text-sm text-white/75">
                {children.map((child) => (
                  <li key={child.id}>Batch {child.batchnummer}</li>
                ))}
              </ul>
              {children[0] && (
                <Link
                  href={`/batch-history?batchId=${encodeURIComponent(children[0].id)}`}
                  className="mt-4 inline-block rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold hover:bg-green-600"
                >
                  View split batches
                </Link>
              )}
            </div>
          ) : (
            <form onSubmit={submitSplit} className="mt-4 space-y-4">
              <p className="text-sm text-white/75">
                Split up to all{" "}
                <Qty kind="volume" value={sourceVolume} maxDecimals={3} />. You can
                keep a portion in this vessel or move portions to other empty
                vessels. Any volume not transferred is recorded as loss.
              </p>

              <div className="space-y-3">
                {allocations.map((allocation, index) => (
                  <div
                    key={index}
                    className="grid gap-3 rounded-lg border border-white/10 bg-black/20 p-3 sm:grid-cols-[minmax(0,1fr)_9rem_auto]"
                  >
                    <label className="text-sm text-white/75">
                      Vessel {index + 1}
                      <select
                        required
                        value={allocation.vesselId}
                        onChange={(event) =>
                          updateAllocation(index, { vesselId: event.target.value })
                        }
                        className="mt-1 block w-full rounded-lg border border-white/20 bg-zinc-900 p-3 text-white"
                      >
                        <option value="" disabled>
                          Select vessel
                        </option>
                        {vessels
                          .filter(
                            (vessel) =>
                              vessel.id === allocation.vesselId ||
                              !selectedVessels.includes(vessel.id)
                          )
                          .map((vessel) => (
                            <option key={vessel.id} value={vessel.id}>
                              Vessel {vessel.nummer ?? "—"}
                              {vessel.isCurrent ? " (current)" : ""}
                            </option>
                          ))}
                      </select>
                    </label>

                    <label className="text-sm text-white/75">
                      Volume (<UnitSymbol kind="volume" />)
                      <UnitInput
                        kind="volume"
                        value={allocation.volumeL}
                        onValueChange={(volumeL) =>
                          updateAllocation(index, { volumeL })
                        }
                        min="0.001"
                        className="mt-1 block w-full rounded-lg border border-white/20 bg-zinc-900 p-3 text-white"
                      />
                    </label>

                    {allocations.length > 2 && (
                      <button
                        type="button"
                        onClick={() =>
                          setAllocations((current) =>
                            current.filter((_, rowIndex) => rowIndex !== index)
                          )
                        }
                        className="self-end rounded-lg border border-white/20 px-3 py-2 text-sm hover:bg-white/10"
                        aria-label={`Remove vessel ${index + 1}`}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {allocations.length < vessels.length && (
                <button
                  type="button"
                  onClick={() =>
                    setAllocations((current) => [
                      ...current,
                      { vesselId: "", volumeL: "0.0000" },
                    ])
                  }
                  className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm font-semibold hover:bg-white/10"
                >
                  Add another vessel
                </button>
              )}

              <div
                className={`rounded-lg border p-3 text-sm ${
                  remainingVolume >= -0.00005
                    ? "border-green-400/20 bg-green-950/20 text-green-200"
                    : "border-red-300/20 bg-red-950/20 text-red-100"
                }`}
              >
                Allocated{" "}
                <Qty kind="volume" value={totalVolume} maxDecimals={3} /> of{" "}
                <Qty kind="volume" value={sourceVolume} maxDecimals={3} />
                {" · Transfer loss: "}
                <Qty kind="volume" value={transferLoss} maxDecimals={3} />
                {remainingVolume < -0.00005 && " · Reduce the allocated volume"}
              </div>

              {error && (
                <p role="alert" className="text-sm text-red-300">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={!isValid || saving}
                className="w-full rounded-lg border border-green-500 bg-green-700 px-4 py-3 font-semibold hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Splitting batch…" : "Confirm split"}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
