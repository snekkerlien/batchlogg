"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import PageHeading from "@/app/components/PageHeading";
import { supabaseBrowser } from "@/lib/supabase/supabaseBrowser";
import BackButton from "@/app/batch-history/BackButton";
import MenuOverlay from "@/app/components/MenuOverlay";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import { useTranslation } from "@/lib/i18n/useTranslation";


type Keg = {
  id: string;
  name: string;
  brew_name: string;
  abv: number | null;
  brew_date: string | null;
  notes: string;
  created_at: string;
};

function mapKeg(row: any, defaultName = "Keg"): Keg {
  return {
    id: row.id,
    name: row.name ?? defaultName,
    brew_name: row.brew_name ?? "",
    abv: typeof row.abv === "number" ? row.abv : null,
    brew_date: row.brew_date ?? null,
    notes: row.notes ?? "",
    created_at: row.created_at ?? new Date().toISOString(),
  };
}

export default function KegTrackerPage() {
  const { t } = useTranslation();
  const [kegs, setKegs] = useState<Keg[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [canManageKegs, setCanManageKegs] = useState(false);
  const [accessLoaded, setAccessLoaded] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  


  const loadKegs = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    try {
      const response = await fetch("/api/kegs", { cache: "no-store" });
      if (!response.ok) throw new Error(`Could not load kegs (${response.status})`);

      const json = await response.json();
      const nextKegs = (Array.isArray(json?.kegs) ? json.kegs : []).map((row: any) =>
        mapKeg(row, t("Keg"))
      );
      setKegs(nextKegs);
    } catch (error) {
      console.error("Failed to load kegs", error);
      setKegs([]);
      const message =
        error instanceof Error ? error.message : "Could not load kegs. Please try again.";
      setLoadError(
        message.startsWith("Could not load kegs (")
          ? t("Could not load kegs ({status})").replace(
              "{status}",
              message.slice("Could not load kegs (".length, -1)
            )
          : t("Could not load kegs. Please try again.")
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    let active = true;

    async function loadAccess(session: Awaited<ReturnType<typeof supabaseBrowser.auth.getSession>>["data"]["session"]) {
      if (!session) {
        if (active) {
          setIsLoggedIn(false);
          setCanManageKegs(false);
          setAccessLoaded(true);
        }
        return;
      }

      const response = await fetch("/api/profile", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(`Could not verify keg permissions (${response.status})`);
      }
      const profile = await response.json();
      if (active) {
        setIsLoggedIn(true);
        setCanManageKegs(
          profile.can_manage_kegs === true ||
          profile.membership_status === "admin" ||
          profile.membership_status === "owner" ||
          profile.membership_status === "developer"
        );
        setAccessLoaded(true);
      }
    }

    supabaseBrowser.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) throw error;
        return loadAccess(data.session);
      })
      .catch((error) => {
        console.error("Could not determine login status", error);
        if (active) {
          setLoadError(t("Could not verify your login status. Please reload the page."));
          setAccessLoaded(true);
        }
      });

    const { data: listener } = supabaseBrowser.auth.onAuthStateChange(
      (_event, session) => {
        void loadAccess(session).catch((error) => {
          console.error("Could not refresh keg permissions", error);
          if (active) {
            setCanManageKegs(false);
            setAccessLoaded(true);
            setLoadError(t("Could not verify keg permissions. Please reload the page."));
          }
        });
      }
    );

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [t]);

  useEffect(() => {
    if (!accessLoaded) return;
    void loadKegs();
  }, [accessLoaded, canManageKegs, loadKegs]);

  useEffect(() => {
    if (canManageKegs) return;
    setSelectMode(false);
    setSelectedIds([]);
  }, [canManageKegs]);

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
      const created = mapKeg(json.keg, t("Keg"));
      setKegs((current) => [...current, created]);
    } catch (error) {
      console.error("Failed to create keg", error);
      setLoadError(t("Could not create a keg. Please try again."));
    } finally {
      setSaving(false);
    }
  }

  function toggleKegSelection(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  function formatDisplayDate(dateString: string | null) {
  if (!dateString) return "";

  const d = new Date(dateString);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
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
      setLoadError(t("Could not delete the selected kegs. Please try again."));
    } finally {
      setSaving(false);
    }
  }

  if (loading || !accessLoaded) {
    return (
      <main className="min-h-screen flex items-center justify-center text-white">
        <div className="bg-black/60 backdrop-blur-md px-6 py-4 rounded-xl border border-white/10">
          {t("Loading kegs…")}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-12 text-white">
      <div className="bg-black/60 backdrop-blur-md p-6 pt-16 sm:p-8 sm:pt-16 rounded-xl border border-white/10 max-w-3xl mx-auto mt-20 sm:mt-24 relative">
        {isLoggedIn === true && canManageKegs ? (
  <>
    <div className="absolute top-2 left-4 z-40 sm:top-4 flex gap-3">
      <BackButton />

      {!selectMode && (
        <button
          type="button"
          onClick={() => {
            setSelectMode(true);
            setSelectedIds([]);
          }}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold"
        >
          {t("Select kegs")}
        </button>
      )}
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
        className="absolute top-2 left-4 z-40 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold sm:top-4"
      >
        {t("Select kegs")}
      </button>
    )}
    <Link
      href="/"
      className="absolute top-2 right-4 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold sm:top-4"
    >
      {t("Go to main site")}
    </Link>
  </>
) : (
  <>
    <div className="absolute left-4 top-2 z-40 sm:top-4">
      <BackButton />
    </div>
    <div className="absolute right-4 top-2 z-40 sm:top-4">
      <MenuOverlay current="kegs" />
    </div>
  </>
)}

        <PageHeading
          title={t("Keg Overview")}
          subtitle={t("Select a keg to view or update its brew details.")}
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
                      {keg.brew_name || t("Keg is empty")}

                    </span>
                    <span className="relative z-10 text-zinc-400 font-semibold mt-2">
                      {keg.brew_name ? "" : ""}

                    </span>
                    {keg.brew_name && (
                      <div className="relative z-10 mt-1 text-xs text-zinc-300 flex flex-col items-center">
                    {keg.abv !== null && (
                      <span>{keg.abv}% ABV</span>
                    )}
                    {keg.brew_date && (
                      <span>{formatDisplayDate(keg.brew_date)}</span>
                    )}
                  </div>
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
                      {keg.brew_name || t("Keg is empty")}
                    </span>
                    <span className="relative z-10 text-zinc-400 text-center font-semibold mt-2">
                      {keg.brew_name ? "" : ""}

                    </span>
                    {keg.brew_name && (
                      <span className="relative z-10 mt-1 text-xs text-zinc-300">
                        {keg.brew_name && (
  <div className="relative z-10 mt-1 text-xs text-zinc-300 flex flex-col items-center">
    {keg.abv !== null && (
      <span>{keg.abv}% ABV</span>
    )}
    {keg.brew_date && (
      <span>{formatDisplayDate(keg.brew_date)}</span>
    )}
  </div>
)}

                      </span>
                    )}
                  </Link>
                )}
              </div>
            );
          })}

          {!selectMode && (
            <button
              type="button"
              onClick={addKeg}
              disabled={saving}
              aria-label={saving ? t("Creating keg") : t("Create keg")}
              className="border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-60 disabled:cursor-wait rounded-xl p-4 w-32 h-32 flex items-center justify-center text-white text-3xl font-bold"
            >
              {saving ? "…" : "+"}
            </button>
          )}
        </section>

        {selectMode && (canManageKegs || isLoggedIn === false) && (
  <div className="flex justify-center mt-10 mb-6">
    <div className="flex flex-col sm:flex-row gap-4">

      {/* DELETE BUTTON WITH CONFIRMATION */}
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        disabled={selectedIds.length === 0 || saving}
        className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold disabled:opacity-40"
      >
        {t("Delete selected")}
      </button>

      <button
        type="button"
        onClick={() => {
          setSelectMode(false);
          setSelectedIds([]);
        }}
        className="px-6 py-3 bg-zinc-700 hover:bg-zinc-600 border border-zinc-500 rounded-lg font-semibold"
      >
        {t("Cancel")}
      </button>
    </div>
  </div>
)}
<ConfirmDialog
  open={confirmOpen}
  title={t("Delete selected kegs?")}
  message={t("Are you sure you want to delete the selected kegs? This action cannot be undone.")}
  confirmLabel={t("Delete")}
  cancelLabel={t("Cancel")}
  pendingLabel={t("Please wait…")}
  onConfirm={async () => {
    await deleteSelectedKegs();
    return true;
  }}
  onCancel={() => setConfirmOpen(false)}
/>


      </div>



    </main>
  );
}
