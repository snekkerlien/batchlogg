"use client";

import { useState } from "react";
import BryggemesterModal from "../components/BryggemesterModal";

export default function Oppskkriftsbygger() {
  const [recipeId, setRecipeId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [ingredienser, setIngredienser] = useState("");
  const [fremgang, setFremgang] = useState("");
  const [notater, setNotater] = useState("");
  const [stil, setStil] = useState("standard");
  const [volume, setVolume] = useState(""); // ⭐ NYTT
  const [statusMsg, setStatusMsg] = useState("");

  const [showModal, setShowModal] = useState(false);

  // Robust parsing av AI‑utkast
  function extractSection(text: string, section: string) {
    if (!text) return ""; // <-- FIKS 1
    const regex = new RegExp(
      `${section}\\s*:?\\s*([\\s\\S]*?)(?=\\n\\s*[A-ZÆØÅ][a-zæøå]+\\s*:|$)`,
      "i"
    );
    const match = text.match(regex);
    return match ? match[1].trim() : "";
  }

  // Når bryggemester er ferdig → fyll inn utkastet
  function handleBryggemesterFinish(
    oppskriftTekst: string,
    meta?: { name: string; stil: string; volume: string } // ⭐ NYTT
  ) {
    if (!oppskriftTekst || typeof oppskriftTekst !== "string") { // <-- FIKS 2
      setStatusMsg("AI returnerte tomt utkast.");
      return;
    }

    // Fyll inn navn og stil fra BryggemesterModal
    if (meta?.name) setName(meta.name);
    if (meta?.stil) setStil(meta.stil);
    if (meta?.volume) setVolume(meta.volume); // ⭐ NYTT

    // Fyll inn seksjonene fra AI-utkastet
    setIngredienser(extractSection(oppskriftTekst, "Ingredienser"));
    setFremgang(extractSection(oppskriftTekst, "Fremgangsmåte"));

    // Notater skal være tomt
    setNotater("");

    setStatusMsg("Utkast generert av bryggemesteren!");
  }

  /* -----------------------------------------
     LAGRE NY OPPskrift (POST)
  ----------------------------------------- */
  async function lagreOppskrift() {
    const res = await fetch("/api/recipes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        ingredients: ingredienser,
        method: fremgang,
        notes: notater,
        volume, // ⭐ NYTT
      }),
    });

    if (res.ok) {
      const data = await res.json();
      setRecipeId(data.recipe.id); // nå kan du oppdatere senere
      setStatusMsg("Oppskrift lagret!");
    } else {
      setStatusMsg("Kunne ikke lagre oppskriften.");
    }
  }

  /* -----------------------------------------
     OPPDATER EKSISTERENDE OPPskrift (PATCH)
  ----------------------------------------- */
  async function oppdaterOppskrift() {
    if (!recipeId) {
      setStatusMsg("Ingen oppskrift å oppdatere.");
      return;
    }

    const res = await fetch(`/api/recipes/${recipeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        ingredients: ingredienser,
        method: fremgang,
        notes: notater,
        volume, // ⭐ NYTT
      }),
    });

    if (res.ok) {
      setStatusMsg("Oppskrift oppdatert!");
    } else {
      setStatusMsg("Kunne ikke oppdatere oppskriften.");
    }
  }

  return (
    <main className="min-h-screen px-6 py-12 text-white flex justify-center">
      <div className="bg-black/60 backdrop-blur-md p-8 rounded-xl w-full max-w-3xl border border-white/10">

        <h1 className="text-4xl font-bold mb-6 text-center">
          Oppskkriftsbygger
        </h1>

        <div className="flex flex-col gap-6">

          <div>
            <label className="block mb-1 font-semibold">Oppskriftsnavn</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="F.eks. Mango Mjød"
              className="w-full p-3 rounded bg-black/40 border border-white/20"
            />
          </div>

          <div>
            <label className="block mb-1 font-semibold">Stil</label>
            <input
              value={stil}
              onChange={(e) => setStil(e.target.value)}
              placeholder="F.eks. tropisk, syrlig, standard, sterk..."
              className="w-full p-3 rounded bg-black/40 border border-white/20"
            />
          </div>

          <div>
            <label className="block mb-1 font-semibold">Ingredienser</label>
            <textarea
              value={ingredienser}
              onChange={(e) => setIngredienser(e.target.value)}
              placeholder="Skriv ingrediensene her..."
              className="w-full p-3 rounded bg-black/40 border border-white/20 h-32"
            />
          </div>

          <div>
            <label className="block mb-1 font-semibold">Fremgangsmåte</label>
            <textarea
              value={fremgang}
              onChange={(e) => setFremgang(e.target.value)}
              placeholder="Skriv fremgangsmåten her..."
              className="w-full p-3 rounded bg-black/40 border border-white/20 h-32"
            />
          </div>

          <div>
            <label className="block mb-1 font-semibold">Notater</label>
            <textarea
              value={notater}
              onChange={(e) => setNotater(e.target.value)}
              placeholder="Notater, tips, variasjoner..."
              className="w-full p-3 rounded bg-black/40 border border-white/20 h-24"
            />
          </div>

          {/* Knappene endrer seg automatisk */}
          {recipeId ? (
            <button
              onClick={oppdaterOppskrift}
              className="px-4 py-3 bg-yellow-600 hover:bg-yellow-500 border border-yellow-400 rounded-lg font-semibold"
            >
              Oppdater oppskrift
            </button>
          ) : (
            <button
              onClick={lagreOppskrift}
              className="px-4 py-3 bg-green-700 hover:bg-green-600 border border-green-500 rounded-lg font-semibold"
            >
              Lagre oppskrift
            </button>
          )}

          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-3 bg-blue-700 hover:bg-blue-600 border border-blue-500 rounded-lg font-semibold"
          >
            Generer oppskrift
          </button>

          {statusMsg && (
            <p className="text-center opacity-80 mt-4">{statusMsg}</p>
          )}
        </div>
      </div>

      {/* Bryggemester Modal */}
      <BryggemesterModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onFinish={handleBryggemesterFinish}
      />
    </main>
  );
}
