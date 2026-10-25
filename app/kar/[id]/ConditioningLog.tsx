"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { createClient } from "@supabase/supabase-js";
import * as Actions from "./actions";
import PublicMentionTextarea from "@/app/components/PublicMentionTextarea";
import PublicMentionText from "@/app/components/PublicMentionText";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const entryTypes = [
  ["rack", "Rack / transfer"],
  ["clarify", "Clarify"],
  ["mature", "Mature / age"],
  ["stabilize", "Stabilize"],
  ["backsweeten", "Backsweeten"],
  ["adjustment", "Add ingredient / adjust"],
  ["taste", "Taste"],
  ["other", "Other"],
] as const;

type EntryType = (typeof entryTypes)[number][0];
type Entry = {
  id: string;
  entry_type: EntryType;
  occurred_at: string;
  details: Record<string, string>;
  notes: string | null;
};

const entryLabels: Record<EntryType, string> = Object.fromEntries(entryTypes) as Record<
  EntryType,
  string
>;

const detailLabels: Record<string, string> = {
  from_vessel: "From",
  to_vessel: "To",
  volume: "Volume",
  volume_loss_l: "Volume lost",
  gravity: "Gravity",
  agent: "Clarifying agent",
  amount: "Amount",
  unit: "Unit",
  contact_time: "Contact time",
  vessel: "Aging vessel / conditions",
  temperature: "Temperature (°C)",
  target_date: "Target tasting date",
  product: "Product",
  wait_hours: "Wait before next step",
  sweetener: "Sweetener",
  adjustment: "Ingredient / adjustment",
  aroma: "Aroma",
  flavor: "Flavor",
  next_step: "Next step",
  description: "Description",
};

function localDateTime() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}T${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`;
}

function Field({
  label,
  name,
  type = "text",
  required = false,
  step,
  min,
  placeholder,
  help,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  step?: string;
  min?: string;
  placeholder?: string;
  help?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span>{label}{required ? " *" : ""}</span>
      <input
        name={name}
        type={type}
        required={required}
        step={step}
        min={min}
        placeholder={placeholder}
        className="rounded border border-white/20 bg-black/40 p-3"
      />
      {help && <span className="text-xs text-white/50">{help}</span>}
    </label>
  );
}

function ActionFields({ type }: { type: EntryType }) {
  switch (type) {
    case "rack":
      return (
        <>
          <Field label="Volume transferred (L)" name="volume" type="number" min="0.001" step="0.001" />
          <Field
            label="Volume lost (L)"
            name="volume_loss_l"
            type="number"
            min="0"
            step="0.001"
            help="Enter what was left behind or otherwise lost, not the amount transferred."
          />
          <Field label="Gravity (optional)" name="gravity" type="number" min="0.001" step="0.001" />
        </>
      );
    case "clarify":
      return (
        <>
          <Field label="Fining agent" name="agent" required />
          <Field label="Amount" name="amount" type="number" min="0.001" step="any" />
          <Field label="Unit" name="unit" placeholder="g, ml, tablets…" />
          <Field label="Contact time" name="contact_time" placeholder="e.g. 3 days" />
        </>
      );
    case "mature":
      return (
        <>
          <Field label="Aging vessel / conditions" name="vessel" />
          <Field label="Temperature (°C)" name="temperature" type="number" step="0.1" />
          <Field label="Target tasting date" name="target_date" type="date" />
        </>
      );
    case "stabilize":
      return (
        <>
          <Field label="Stabilizing product" name="product" required placeholder="e.g. Yeast Stop" />
          <Field label="Amount" name="amount" type="number" min="0.001" step="any" />
          <Field label="Unit" name="unit" placeholder="g, ml, tablets…" />
          <Field label="Wait before next step (hours)" name="wait_hours" type="number" min="0" step="any" placeholder="e.g. 24" />
        </>
      );
    case "backsweeten":
      return (
        <>
          <Field label="Sweetener" name="sweetener" required />
          <Field label="Amount" name="amount" type="number" min="0.001" step="any" />
          <Field label="Unit" name="unit" placeholder="g, ml, kg…" />
          <Field label="Gravity after backsweetening (optional)" name="gravity" type="number" min="0.001" step="0.001" />
        </>
      );
    case "adjustment":
      return (
        <>
          <Field label="Ingredient / adjustment" name="adjustment" required />
          <Field label="Amount" name="amount" type="number" min="0.001" step="any" />
          <Field label="Unit" name="unit" placeholder="g, ml, tsp…" />
        </>
      );
    case "taste":
      return (
        <>
          <Field label="Aroma" name="aroma" />
          <Field label="Flavor" name="flavor" />
          <Field label="Next step" name="next_step" />
        </>
      );
    case "other":
      return <Field label="What did you do?" name="description" required />;
  }
}

function formatDetailValue(key: string, value: string, details: Record<string, string>) {
  if (key === "amount" || key === "volume") {
    const unit = details.unit ? ` ${details.unit}` : key === "volume" ? " L" : "";
    return `${value}${unit}`;
  }
  if (key === "volume_loss_l") return `${value} L`;
  if (key === "wait_hours") return `${value} hours`;
  if (key === "target_date") return new Date(`${value}T12:00:00`).toLocaleDateString();
  return value;
}

export default function ConditioningLog({
  batchId,
  karId,
  canContribute,
}: {
  batchId: string;
  karId: string;
  canContribute: boolean;
}) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [entryType, setEntryType] = useState<EntryType>("rack");
  const [occurredAt, setOccurredAt] = useState(localDateTime);
  const [timezoneOffset, setTimezoneOffset] = useState(() => new Date().getTimezoneOffset());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: loadError } = await supabase
        .from("batch_conditioning_entries")
        .select("id, entry_type, occurred_at, details, notes")
        .eq("batch_id", batchId)
        .order("occurred_at", { ascending: false })
        .order("created_at", { ascending: false });
      if (loadError) {
        console.error("Could not load conditioning entries", loadError);
        setLoadError("Could not load conditioning entries. Please try again.");
      } else {
        setEntries((data ?? []) as Entry[]);
        setLoadError("");
      }
    } catch (loadError) {
      console.error("Could not load conditioning entries", loadError);
      setLoadError("Could not load conditioning entries. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const form = event.currentTarget;
    try {
      await Actions.addConditioningEntry(batchId, karId, new FormData(form));
      form.reset();
      setEntryType("rack");
      setOccurredAt(localDateTime());
      setTimezoneOffset(new Date().getTimezoneOffset());
      await loadEntries();
    } catch (saveError) {
      console.error("Could not save conditioning entry", saveError);
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save conditioning entry. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section id="conditioning-activity" className="mb-5 mt-5 scroll-mt-6 rounded-xl border border-white/10 bg-white/[0.04] p-5">
      <h3 className="mb-2 text-lg font-semibold text-green-300">Conditioning activity</h3>
      <p className="mb-4 text-sm text-white/65">
        Keep a dated record of transfers, treatments, aging, tasting, and other conditioning steps.
      </p>

      {canContribute && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-lg border border-white/10 bg-black/20 p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm">
              <span>Action</span>
              <select
                name="entry_type"
                value={entryType}
                onChange={(event) => setEntryType(event.target.value as EntryType)}
                className="rounded border border-white/20 bg-black/40 p-3"
              >
                {entryTypes.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span>Date and time</span>
              <input
                name="occurred_at"
                type="datetime-local"
                required
                value={occurredAt}
                onChange={(event) => {
                  setOccurredAt(event.target.value);
                  const date = new Date(event.target.value);
                  if (!Number.isNaN(date.getTime())) {
                    setTimezoneOffset(date.getTimezoneOffset());
                  }
                }}
                className="rounded border border-white/20 bg-black/40 p-3"
              />
            </label>
            <input
              type="hidden"
              name="timezone_offset_minutes"
              value={timezoneOffset}
            />
            <ActionFields type={entryType} />
          </div>
          <label className="mt-4 flex w-full flex-col gap-1.5 text-sm">
            <span>Notes (optional)</span>
            <PublicMentionTextarea
              name="notes"
              maxLength={3000}
              rows={6}
              className="min-h-32 w-full resize-y rounded border border-white/20 bg-black/40 p-3"
            />
          </label>
          {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="mt-4 rounded-lg border border-green-500 bg-green-700 px-4 py-3 font-semibold hover:bg-green-600 disabled:cursor-wait disabled:opacity-50"
          >
            {saving ? "Saving…" : "Add conditioning entry"}
          </button>
        </form>
      )}

      {loadError && (
        <div className="mb-4 text-sm text-red-300">
          <p role="alert">{loadError}</p>
          <button type="button" onClick={() => void loadEntries()} className="mt-1 underline">
            Try again
          </button>
        </div>
      )}
      {loading ? (
        <p className="text-sm text-white/60">Loading conditioning history…</p>
      ) : loadError ? null : entries.length === 0 ? (
        <p className="text-sm text-white/60">No conditioning activity has been recorded yet.</p>
      ) : (
        <ol className="space-y-3">
          {entries.map((entry) => {
            const details = entry.details ?? {};
            const detailRows = Object.entries(details).filter(
              ([key, value]) => key !== "unit" && value
            );
            return (
              <li key={entry.id} className="rounded-lg border border-white/10 bg-black/20 p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h4 className="font-semibold text-white">{entryLabels[entry.entry_type] ?? "Conditioning action"}</h4>
                  <time className="text-sm text-white/55" dateTime={entry.occurred_at}>
                    {new Date(entry.occurred_at).toLocaleString()}
                  </time>
                </div>
                {detailRows.length > 0 && (
                  <dl className="mt-3 grid gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
                    {detailRows.map(([key, value]) => (
                      <div key={key}>
                        <dt className="text-xs text-white/50">{detailLabels[key] ?? key}</dt>
                        <dd className="whitespace-pre-wrap text-white/85">
                          {formatDetailValue(key, value, details)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
                {entry.notes && (
                  <p className="mt-3 whitespace-pre-wrap text-sm text-white/75">
                    <PublicMentionText text={entry.notes} />
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
