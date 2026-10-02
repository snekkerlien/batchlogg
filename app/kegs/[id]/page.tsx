"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import PageHeading from "@/app/components/PageHeading";

type Keg = {
  id: string;
  name: string;
  brew_name: string;
  abv: number | null;
  brew_date: string | null;
  notes: string;
  created_at: string;
};

async function fetchKeg(id: string) {
  const response = await fetch(`/api/kegs?id=${encodeURIComponent(id)}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Keg not found");
  }

  const json = await response.json();
  return json.keg as Keg | null;
}

export default function KegPublicPage() {
  const params = useParams();
  const rawId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const [keg, setKeg] = useState<Keg | null>(null);
  const [kegName, setKegName] = useState("");
  const [brewName, setBrewName] = useState("");
  const [abv, setAbv] = useState("");
  const [brewDate, setBrewDate] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    async function load() {
      if (!rawId) return;

      try {
        const item = await fetchKeg(rawId);
        setKeg(item ?? null);
        setKegName(item?.name ?? "");
        setBrewName(item?.brew_name ?? "");
        setAbv(item?.abv === null || item?.abv === undefined ? "" : String(item.abv));
        setBrewDate(item?.brew_date ?? "");
        setNotes(item?.notes ?? "");
      } catch (error) {
        console.error("Could not load keg", error);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [rawId]);

  async function saveKeg() {
    if (!keg || !rawId) return;

    setSaving(true);
    setSaveError("");
    try {
      const response = await fetch("/api/kegs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          id: rawId,
          name: kegName.trim() || keg.name,
          brew_name: brewName.trim(),
          abv: abv.trim() === "" ? null : Number(abv),
          brew_date: brewDate || null,
          notes: notes.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error("Could not save keg data");
      }

      setKeg({
        ...keg,
        name: kegName.trim() || keg.name,
        brew_name: brewName.trim(),
        abv: abv.trim() === "" ? null : Number(abv),
        brew_date: brewDate || null,
        notes: notes.trim(),
      });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
    } catch (error) {
      console.error("Could not save keg data", error);
      setSaveError("Could not save keg details. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center text-white">
        <div className="bg-black/60 backdrop-blur-md px-6 py-4 rounded-xl border border-white/10">
          Loading keg…
        </div>
      </main>
    );
  }

  if (!rawId || !keg) {
    return (
      <main className="min-h-screen px-6 py-12 text-white">
        <div className="bg-black/60 backdrop-blur-md p-6 pt-16 sm:p-8 sm:pt-16 rounded-xl border border-white/10 max-w-3xl mx-auto mt-20 sm:mt-24 relative">
          <div className="absolute top-4 left-4 right-4 flex justify-between gap-3">
            <Link
              href="/kegs"
              className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold"
            >
              Back to kegs
            </Link>
            <Link
              href="/"
              className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold"
            >
              Go to main site
            </Link>
          </div>
          <PageHeading title="Keg not found" subtitle="This keg is not registered in the database yet." />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-12 text-white">
      <div className="bg-black/60 backdrop-blur-md p-6 pt-16 sm:p-8 sm:pt-16 rounded-xl border border-white/10 max-w-3xl mx-auto mt-20 sm:mt-24 relative">
        <div className="absolute top-4 left-4 right-4 flex justify-between gap-3">
          <Link
            href="/kegs"
            className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold"
          >
            Back to kegs
          </Link>
          <Link
            href="/"
            className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold"
          >
            Go to main site
          </Link>
        </div>
        <PageHeading
          title={keg.name}
          subtitle={keg.brew_name || "No brew registered yet"}
        />

      <div className="mt-6 space-y-5">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-zinc-300">Keg name</span>
          <input
            value={kegName}
            onChange={(event) => setKegName(event.target.value)}
            className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-3 outline-none focus:border-green-400"
            placeholder="Example: Keg 1"
          />
        </label>

        <label className="block">
            <span className="mb-2 block text-sm font-medium text-zinc-300">Brew name</span>
            <input
              value={brewName}
              onChange={(event) => setBrewName(event.target.value)}
              className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-3 outline-none focus:border-green-400"
              placeholder="Example: Hazy Pale"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-zinc-300">ABV (%)</span>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={abv}
                onChange={(event) => setAbv(event.target.value)}
                className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-3 outline-none focus:border-green-400"
                placeholder="Example: 5.2"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-zinc-300">Date</span>
              <input
                type="date"
                value={brewDate}
                onChange={(event) => setBrewDate(event.target.value)}
                className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-3 text-white outline-none focus:border-green-400"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-zinc-300">Notes</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={6}
              className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-3 outline-none focus:border-green-400"
              placeholder="Add brewing notes, carbonation, tasting notes, or anything else that matters."
            />
          </label>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={saveKeg}
            disabled={saving}
            className="px-6 py-3 bg-green-700 hover:bg-green-800 rounded-lg font-semibold"
          >
            {saving ? "Saving…" : "Save keg details"}
          </button>

          {saved && (
            <span className="rounded-full border border-emerald-400/60 bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-200">
              Saved
            </span>
          )}
        </div>
        {saveError && (
          <p role="alert" className="mt-4 text-red-300">
            {saveError}
          </p>
        )}
      </div>
    </main>
  );
}
