"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";
import Link from "next/link";
import PageHeading from "@/app/components/PageHeading";
import { supabaseBrowser } from "@/lib/supabase/supabaseBrowser";
import BackButton from "@/app/batchhistorikk/BackButton";
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

function mapKeg(row: any): Keg {
  return {
    id: row.id,
    name: row.name ?? "Keg",
    brew_name: row.brew_name ?? "",
    abv: typeof row.abv === "number" ? row.abv : null,
    brew_date: row.brew_date ?? null,
    notes: row.notes ?? "",
    created_at: row.created_at ?? new Date().toISOString(),
  };
}

export default function KegTrackerPage() {
  const [kegs, setKegs] = useState<Keg[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [qrSrc, setQrSrc] = useState<string | null>(null);
  const [qrKegId, setQrKegId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  async function loadKegs() {
    setLoading(true);
    setLoadError("");

    try {
      const response = await fetch("/api/kegs", { cache: "no-store" });
      if (!response.ok) throw new Error(`Could not load kegs (${response.status})`);

      const json = await response.json();
      const nextKegs = (Array.isArray(json?.kegs) ? json.kegs : []).map(mapKeg);
      setKegs(nextKegs);
    } catch (error) {
      console.error("Failed to load kegs", error);
      setKegs([]);
      setLoadError(
        error instanceof Error
          ? error.message
          : "Could not load kegs. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

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
        if (active) {
          setLoadError("Could not verify your login status. Please reload the page.");
        }
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
    loadKegs();
  }, []);

  async function addKeg() {
    setSaving(true);
    setLoadError("");

    try {
      const response = await fetch("/api/kegs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create" }),
      });

      if (!response.ok) throw new Error("Could not create keg");

      const json = await response.json();
      const created = mapKeg(json.keg);
      setKegs((current) => [...current, created]);
    } catch (error) {
      console.error("Failed to create keg", error);
      setLoadError("Could not create a keg. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function toggleKegSelection(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  async function deleteSelectedKegs() {
    if (selectedIds.length === 0) return;

    setSaving(true);
    setLoadError("");

    try {
      const response = await fetch("/api/kegs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", ids: selectedIds }),
      });

      if (!response.ok) throw new Error("Could not delete kegs");

      const remaining = kegs.filter((keg) => !selectedIds.includes(keg.id));
      setKegs(remaining);
      setSelectedIds([]);
      setSelectMode(false);
    } catch (error) {
      console.error("Failed to delete kegs", error);
      setLoadError("Could not delete the selected kegs. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function generateQr(keg: Keg) {
    const qrUrl = new URL(`/kegs/${keg.id}`, window.location.origin).toString();
    const png = await QRCode.toDataURL(qrUrl, {
      width: 600,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    });

    setQrSrc(png);
    setQrKegId(keg.id);
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center text-white">
        <div className="bg-black/60 backdrop-blur-md px-6 py-4 rounded-xl border border-white/10">
          Loading kegs…
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-12 text-white">
      <div className="bg-black/60 backdrop-blur-md p-6 pt-16 sm:p-8 sm:pt-16 rounded-xl border border-white/10 max-w-3xl mx-auto mt-20 sm:mt-24 relative">
        {isLoggedIn === true ? (
          <>
            <div className="absolute top-2 left-4 z-40 sm:top-4">
              <BackButton />
            </div>
            <div className="absolute top-2 right-4 z-40 sm:top-4">
              <MenuOverlay current="kegs" />
            </div>
          </>
        ) : isLoggedIn === false ? (
          <>
            {!selectMode && (
              <button
                type="button"
                onClick={() => {
                  setSelectMode(true);
                  setSelectedIds([]);
                }}
                className="absolute top-2 left-4 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold sm:top-4"
              >
                Select kegs
              </button>
            )}
            <Link
              href="/"
              className="absolute top-2 right-4 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold sm:top-4"
            >
              Go to main site
            </Link>
          </>
        ) : null}
        <PageHeading
          title="Keg Overview"
          subtitle="Select a keg to register its brew, or scan its QR code to update it."
        />

        {loadError && (
          <div
            role="alert"
            className="mb-6 rounded-lg border border-red-500/50 bg-red-700/30 p-4 text-center"
          >
            {loadError}
          </div>
        )}

        <section className="flex flex-wrap justify-center gap-6">
          {kegs.map((keg) => {
            const isSelected = selectedIds.includes(keg.id);
            const tileClass = `relative border border-white/10 rounded-xl p-4 bg-white/5 w-32 h-32 flex flex-col items-center justify-center transition overflow-hidden hover:bg-white/10 ${
              isSelected ? "ring-4 ring-red-500" : ""
            }`;

            return (
              <div
                key={keg.id}
                className="flex flex-col items-center gap-2"
              >
                {selectMode ? (
                  <button
                    type="button"
                    onClick={() => toggleKegSelection(keg.id)}
                    aria-pressed={isSelected}
                    className={tileClass}
                  >
                    {keg.brew_name && (
                      <div className="bubble-container">
                        {[...Array(6)].map((_, index) => (
                          <span
                            key={index}
                            className="bubble"
                            style={{
                              left: `${(index * 37 + 11) % 100}%`,
                              animationDuration: `${2 + (index % 3)}s`,
                              animationDelay: `${((index * 7) % 20) / 10}s`,
                              width: `${4 + (index % 3) * 2}px`,
                              height: `${4 + (index % 3) * 2}px`,
                            }}
                          />
                        ))}
                      </div>
                    )}
                    <span className="relative z-10 text-lg font-bold text-green-300 text-center leading-tight line-clamp-2">
                      {keg.brew_name || keg.name}
                    </span>
                    <span className="relative z-10 text-zinc-400 font-semibold mt-2">
                      {keg.brew_name ? keg.name : "Empty"}
                    </span>
                    {keg.brew_name && (
                      <span className="relative z-10 mt-1 text-xs text-zinc-300">
                        {keg.abv !== null ? `${keg.abv}% ABV` : ""}
                        {keg.abv !== null && keg.brew_date ? " · " : ""}
                        {keg.brew_date ?? ""}
                      </span>
                    )}
                  </button>
                ) : (
                  <Link href={`/kegs/${keg.id}`} className={tileClass}>
                    {keg.brew_name && (
                      <div className="bubble-container">
                        {[...Array(6)].map((_, index) => (
                          <span
                            key={index}
                            className="bubble"
                            style={{
                              left: `${(index * 37 + 11) % 100}%`,
                              animationDuration: `${2 + (index % 3)}s`,
                              animationDelay: `${((index * 7) % 20) / 10}s`,
                              width: `${4 + (index % 3) * 2}px`,
                              height: `${4 + (index % 3) * 2}px`,
                            }}
                          />
                        ))}
                      </div>
                    )}
                    <span className="relative z-10 text-lg font-bold text-green-300 text-center leading-tight line-clamp-2">
                      {keg.brew_name || keg.name}
                    </span>
                    <span className="relative z-10 text-zinc-400 font-semibold mt-2">
                      {keg.brew_name ? keg.name : "Empty"}
                    </span>
                    {keg.brew_name && (
                      <span className="relative z-10 mt-1 text-xs text-zinc-300">
                        {keg.abv !== null ? `${keg.abv}% ABV` : ""}
                        {keg.abv !== null && keg.brew_date ? " · " : ""}
                        {keg.brew_date ?? ""}
                      </span>
                    )}
                  </Link>
                )}

                <button
                  type="button"
                  onClick={() => generateQr(keg)}
                  className="px-3 py-1 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm font-semibold"
                >
                  QR code
                </button>
              </div>
            );
          })}

          {!selectMode && (
            <button
              type="button"
              onClick={addKeg}
              disabled={saving}
              aria-label={saving ? "Creating keg" : "Create keg"}
              className="border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-60 disabled:cursor-wait rounded-xl p-4 w-32 h-32 flex items-center justify-center text-white text-3xl font-bold"
            >
              {saving ? "…" : "+"}
            </button>
          )}
        </section>

        {selectMode && (
          <div className="flex justify-center mt-10 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                type="button"
                onClick={deleteSelectedKegs}
                disabled={selectedIds.length === 0 || saving}
                className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold disabled:opacity-40"
              >
                Delete selected
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectMode(false);
                  setSelectedIds([]);
                }}
                className="px-6 py-3 bg-zinc-700 hover:bg-zinc-600 border border-zinc-500 rounded-lg font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

      </div>

      {qrSrc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={() => setQrSrc(null)}
        >
          <div
            className="w-full max-w-lg rounded-xl border border-white/10 bg-black/60 p-6 text-center backdrop-blur-md"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="mb-4 text-2xl font-bold">Keg QR code</h3>
            <div className="rounded-2xl bg-white p-4">
              <img src={qrSrc} alt="QR code for keg" className="mx-auto h-auto w-full max-w-xs" />
            </div>

            <div className="mt-5 flex justify-center gap-3">
              <a
                href={qrSrc}
                download={`keg-${qrKegId ?? "qr"}.png`}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold"
              >
                Save PNG
              </a>

              <button
                type="button"
                onClick={() => setQrSrc(null)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
