"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type InventoryMovement = {
  id: string;
  item_name: string;
  movement_type: "opening" | "restock" | "adjustment" | "batch_use" | "removed";
  quantity_change: number;
  balance_after: number;
  unit: string;
  batch_id: string | null;
  created_at: string;
};

const movementLabels: Record<InventoryMovement["movement_type"], string> = {
  opening: "Added to inventory",
  restock: "Stock increased",
  adjustment: "Stock adjusted",
  batch_use: "Used in batch",
  removed: "Item removed",
};

function formatQuantity(value: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 3 }).format(value);
}

export default function InventoryMovementHistory() {
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!expanded || loaded || error) return;
    let active = true;
    setLoading(true);

    async function loadHistory() {
      try {
        const response = await fetch("/api/inventory/history", {
          credentials: "include",
          cache: "no-store",
        });
        const result = (await response.json()) as {
          movements?: InventoryMovement[];
          error?: string;
        };
        if (!response.ok) {
          throw new Error(result.error || "Could not load stock history.");
        }
        if (active) setMovements(result.movements ?? []);
      } catch (loadError) {
        console.error("Could not load inventory movement history", loadError);
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load stock history."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
          setLoaded(true);
        }
      }
    }

    void loadHistory();
    return () => {
      active = false;
    };
  }, [error, expanded, loaded]);

  return (
    <details
      className="mt-12 rounded-xl border border-white/10 bg-white/[0.03]"
      onToggle={(event) => setExpanded(event.currentTarget.open)}
    >
      <summary className="cursor-pointer list-none px-4 py-4 text-center text-xl font-bold marker:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-300">
        <span className="inline-flex items-center gap-2">
          Recent stock history
          <span aria-hidden="true" className="text-sm text-white/50">
            {expanded ? "−" : "+"}
          </span>
        </span>
      </summary>
      <section aria-label="Recent stock history" className="px-4 pb-4">
        {loading ? (
          <p className="text-center text-sm text-white/60">Loading stock history…</p>
        ) : error ? (
          <p role="status" className="text-center text-sm text-amber-200">
            {error}
          </p>
        ) : movements.length === 0 ? (
          <p className="text-center text-sm text-white/60">
            Stock changes will appear here as you add, update, use, or remove inventory.
          </p>
        ) : (
          <ol className="divide-y divide-white/10 rounded-xl border border-white/10">
            {movements.map((movement) => {
              const quantityChange = Number(movement.quantity_change);
              const sign = quantityChange > 0 ? "+" : "";
              const changeColor =
                quantityChange > 0
                  ? "text-green-300"
                  : quantityChange < 0
                    ? "text-amber-200"
                    : "text-white/70";

              return (
                <li
                  key={movement.id}
                  className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{movement.item_name}</p>
                    <p className="text-xs text-white/60">
                      {movementLabels[movement.movement_type]} ·{" "}
                      {new Date(movement.created_at).toLocaleString()}
                    </p>
                    {movement.batch_id && (
                      <Link
                        href={`/kar/${movement.batch_id}`}
                        className="mt-1 inline-block text-xs text-green-200 underline underline-offset-2"
                      >
                        View batch
                      </Link>
                    )}
                  </div>
                  <div className="shrink-0 text-sm sm:text-right">
                    <p className={`font-semibold ${changeColor}`}>
                      {sign}
                      {formatQuantity(quantityChange)} {movement.unit}
                    </p>
                    <p className="text-xs text-white/60">
                      Balance: {formatQuantity(Number(movement.balance_after))}{" "}
                      {movement.unit}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </details>
  );
}
