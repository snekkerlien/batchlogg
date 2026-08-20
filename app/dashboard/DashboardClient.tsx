"use client";

import { useState } from "react";

type KarType = {
  id: number;
  created_at: string;
};

type DashboardClientProps = {
  username: string;
  kar: KarType[];
};

export default function DashboardClient({ username, kar }: DashboardClientProps) {
  const karCount = kar.length;
  const hasPlus = karCount < 12;

  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);

  function toggleSelect(id: number) {
    if (!selectMode) return;

    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function deleteSelected() {
    if (selected.length === 0) return;

    await fetch("/kar/delete-multiple", {
      method: "POST",
      body: JSON.stringify({ ids: selected }),
      headers: { "Content-Type": "application/json" },
    });

    // Automatisk ut av valg-modus
    setSelectMode(false);
    setSelected([]);

    // Reload dashboard
    window.location.reload();
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="absolute top-4 right-4">
        <form action="/logout" method="post">
          <button className="px-4 py-2 bg-red-600 hover:bg-red-700 border border-red-800 rounded-lg font-semibold">
            Logg ut
          </button>
        </form>
      </div>

      <div className="bg-black/60 backdrop-blur-md p-8 rounded-xl w-full max-w-4xl border border-white/10 text-center">

        <h1 className="text-2xl font-bold mb-4">
          Logget inn som {username}
        </h1>

        <p className="opacity-80 mb-8 text-lg">
          Velkommen tilbake til bryggeriet, kompis 🍻
        </p>

        <a
          href="/profiles"
          className="inline-block mb-8 px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold"
        >
          Se andre bryggere
        </a>

        {/* SELECT MODE BUTTONS */}
        <div className="mb-6 flex gap-4 justify-center">
          {!selectMode && (
            <button
              onClick={() => setSelectMode(true)}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold"
            >
              Velg kar
            </button>
          )}

          {selectMode && (
            <>
              <button
                onClick={deleteSelected}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 border border-red-800 rounded-lg font-semibold"
              >
                Slett valgte kar ({selected.length})
              </button>

              <button
                onClick={() => {
                  setSelectMode(false);
                  setSelected([]);
                }}
                className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold"
              >
                Avslutt valg
              </button>
            </>
          )}
        </div>

        {/* GRID */}
        <div
          className={`
            grid
            grid-cols-2
            md:grid-cols-3
            gap-6
            md:gap-4
            mx-auto
            max-w-[36rem]
            place-items-center
          `}
        >
          {kar.map((k, index) => {
            const isSelected = selected.includes(k.id);

            return (
              <div
                key={k.id}
                onClick={() => toggleSelect(k.id)}
                className={`
                  relative border border-white/10 rounded-xl p-6 transition flex flex-col items-center justify-center
                  w-40 h-40 md:w-28 md:h-28
                  ${selectMode ? "cursor-pointer" : ""}
                  ${isSelected ? "bg-green-900/40 border-green-400" : "bg-white/5 hover:bg-white/10"}
                `}
              >
                <span className="absolute top-[10px] text-xl font-bold text-green-300 md:text-lg">
                  Kar {index + 1}
                </span>

                <span className="text-zinc-300 mt-12 text-lg md:text-base">
                  Ledig
                </span>
              </div>
            );
          })}

          {hasPlus && !selectMode && (
            <form action="/kar/add" method="post">
              <button
                className="border border-white/10 rounded-xl p-6 bg-white/5 hover:bg-white/10 transition flex flex-col items-center justify-center w-40 h-40 md:w-28 md:h-28 text-5xl md:text-4xl font-bold text-green-300"
              >
                +
              </button>
            </form>
          )}
        </div>

        <p className="text-sm opacity-40 mt-12">
          © {new Date().getFullYear()} Fiklebrygg AS.
        </p>
      </div>
    </main>
  );
}
