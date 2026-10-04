"use client";

import QRCode from "qrcode";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import PageHeading from "@/app/components/PageHeading";
import { supabaseBrowser } from "@/lib/supabase/supabaseBrowser";
import BackButton from "@/app/batch-history/BackButton";
import MenuOverlay from "@/app/components/MenuOverlay";

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
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [qrSrc, setQrSrc] = useState<string | null>(null);
  const [qrError, setQrError] = useState("");

  useEffect(() => {
    let active = true;

    supabaseBrowser.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) throw error;
        if (active) setIsLoggedIn(Boolean(data.session));
      })
      .catch((error) => {
        console.error("Could not determine login status", error);
      });

    const { data: listener } = supabaseBrowser.auth.onAuthStateChange(
      (_event, session) => {
        if (active) setIsLoggedIn(Boolean(session));
      }
    );

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

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

  async function generateQr() {
    if (!rawId) return;
    setQrError("");
    try {
      const qrUrl = new URL(`/kegs/${rawId}`, window.location.origin).toString();
      const png = await QRCode.toDataURL(qrUrl, {
        width: 600,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      });
      setQrSrc(png);
    } catch (error) {
      console.error("Could not generate keg QR code", error);
      setQrError("Could not generate the QR code. Please try again.");
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
          <KegPageTopBar isLoggedIn={isLoggedIn} />
          <PageHeading title="Keg not found" subtitle="This keg is not registered in the database yet." />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-12 text-white">
      <div className="bg-black/60 backdrop-blur-md p-6 pt-16 sm:p-8 sm:pt-16 rounded-xl border border-white/10 max-w-3xl mx-auto mt-20 sm:mt-24 relative">
        <KegPageTopBar isLoggedIn={isLoggedIn} />
        <PageHeading
          title={keg.name}
          subtitle={keg.brew_name || "No brew registered yet"}
        />

      <div className="mt-6 space-y-5">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-zinc-300">Brew name</span>
          <input
            value={brewName}
            onChange={(event) => setBrewName(event.target.value)}
            className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-3 outline-none focus:border-green-400"
            placeholder="Example: Hazy IPA"
          />
        </label>

        <label className="block">
            <span className="mb-2 block text-sm font-medium text-zinc-300">Keg number</span>
            <input
              value={kegName}
              onChange={(event) => setKegName(event.target.value)}
              className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-3 outline-none focus:border-green-400"
              placeholder="Example: Keg 1"
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

          <button
            type="button"
            onClick={generateQr}
            className="px-6 py-3 border border-white/20 bg-white/10 hover:bg-white/20 rounded-lg font-semibold"
          >
            QR code
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
        {qrError && (
          <p role="alert" className="mt-4 text-center text-red-300">
            {qrError}
          </p>
        )}
      </div>

      {qrSrc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setQrSrc(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="keg-qr-title"
            className="w-full max-w-lg rounded-xl border border-white/10 bg-black/80 p-6 text-center backdrop-blur-md"
          >
            <h2 id="keg-qr-title" className="mb-4 text-2xl font-bold">
              Keg QR code
            </h2>
            <div className="rounded-2xl bg-white p-4">
              <img
                src={qrSrc}
                alt={`QR code for ${keg.name}`}
                className="mx-auto h-auto w-full max-w-xs"
              />
            </div>
            <div className="mt-5 flex justify-center gap-3">
              <a
                href={qrSrc}
                download={`keg-${keg.id}.png`}
                className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 font-semibold hover:bg-white/20"
              >
                Save PNG
              </a>
              <button
                type="button"
                onClick={() => setQrSrc(null)}
                className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 font-semibold hover:bg-white/20"
              >
                Close
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function KegPageTopBar({ isLoggedIn }: { isLoggedIn: boolean | null }) {
  if (isLoggedIn === true) {
    return (
      <>
        <div className="absolute top-2 left-4 z-40 sm:top-4">
          <BackButton />
        </div>
        <div className="absolute top-2 right-4 z-40 sm:top-4">
          <MenuOverlay current="kegs" />
        </div>
      </>
    );
  }

  if (isLoggedIn === false) {
    return (
      <div className="absolute top-2 left-4 right-4 flex justify-between gap-3 sm:top-4">
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
    );
  }

  return null;
}
