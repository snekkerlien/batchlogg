"use client";

import { useState, useEffect, useRef } from "react";

interface BryggemesterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFinish: (draft: string, meta: { name: string; stil: string; volume: string }) => void;
}

export default function BryggemesterModal({
  isOpen,
  onClose,
  onFinish,
}: BryggemesterModalProps) {
  const [chat, setChat] = useState([
    { sender: "ai", text: "Hei! Jeg er Batchlogg sin AI-assistent. Hva skal oppskriften din hete?" }
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Wizard‑state
  const [name, setName] = useState("");
  const [stil, setStil] = useState("");
  const [ingredienser, setIngredienser] = useState("");
  const [volume, setVolume] = useState(""); // ⭐ NYTT
  const [wizardStep, setWizardStep] = useState(1);

  const chatRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [chat]);

  async function sendMessage() {
    if (!input.trim()) return;

    const userMsg = input.trim();
    const lower = userMsg.toLowerCase();

    setChat((prev) => [...prev, { sender: "user", text: userMsg }]);
    setInput("");
    setLoading(true);

    // -----------------------------
    // WIZARD STEG 1 – NAVN
    // -----------------------------
    if (wizardStep === 1) {
      setName(userMsg);
      setWizardStep(2);
      setChat((prev) => [
        ...prev,
        { sender: "ai", text: "Hvilken stil ønsker du? (tropisk, syrlig, standard, sterk, fruktig, tørr …)" }
      ]);
      setLoading(false);
      return;
    }

    // -----------------------------
    // WIZARD STEG 2 – STIL
    // -----------------------------
    if (wizardStep === 2) {
      setStil(userMsg);
      setWizardStep(3);
      setChat((prev) => [
        ...prev,
        { sender: "ai", text: "Vil du legge inn ingredienser selv, eller skal jeg foreslå en liste?" }
      ]);
      setLoading(false);
      return;
    }

    // -----------------------------
    // WIZARD STEG 3 – INGREDIENSVALG
    // -----------------------------
    if (wizardStep === 3) {
      if (
        lower.includes("kg") ||
        lower.includes("liter") ||
        lower.includes("l") ||
        lower.includes("honning") ||
        lower.includes("juice") ||
        lower.includes("frukt") ||
        lower.includes("monster") ||
        lower.includes("mango")
      ) {
        setIngredienser(userMsg);
        setWizardStep(4);
        setChat((prev) => [
          ...prev,
          { sender: "ai", text: "Hvor mange liter skal du brygge?" } // ⭐ NYTT
        ]);
        setLoading(false);
        return;
      }

      if (lower.includes("ai")) {
        const res = await fetch("/api/groq/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: `Lag kun ingrediensliste basert på navn "${name}" og stil "${stil}". Skriv kun ingrediensene.`,
          }),
        });

        const data = await res.json();
        setIngredienser(data.reply);

        setChat((prev) => [
          ...prev,
          { sender: "ai", text: `Her er ingrediensene jeg foreslår:\n\n${data.reply}` },
          { sender: "ai", text: "Hvor mange liter skal du brygge?" } // ⭐ NYTT
        ]);

        setWizardStep(4);
        setLoading(false);
        return;
      }

      setIngredienser("");
      setChat((prev) => [
        ...prev,
        { sender: "ai", text: "Flott! Skriv inn ingrediensene du vil bruke." }
      ]);
      setWizardStep(31);
      setLoading(false);
      return;
    }

    // -----------------------------
    // WIZARD STEG 31 – BRUKER SKRIVER INGREDIENSER
    // -----------------------------
    if (wizardStep === 31) {
      setIngredienser(userMsg);
      setWizardStep(4);
      setChat((prev) => [
        ...prev,
        { sender: "ai", text: "Hvor mange liter skal du brygge?" } // ⭐ NYTT
      ]);
      setLoading(false);
      return;
    }

    // -----------------------------
    // WIZARD STEG 4 – LITER
    // -----------------------------
    if (wizardStep === 4) {
      setVolume(userMsg); // ⭐ NYTT
      setWizardStep(5);
      setChat((prev) => [
        ...prev,
        { sender: "ai", text: "Skal jeg lage et utkast basert på dette?" }
      ]);
      setLoading(false);
      return;
    }

    // -----------------------------
    // WIZARD STEG 5 – JA/NEI
    // -----------------------------
    if (wizardStep === 5) {
      setChat((prev) => [
        ...prev,
        { sender: "ai", text: "Trykk Ja eller Nei." }
      ]);
      setLoading(false);
      return;
    }

    // -----------------------------
    // FRI BRYGGESPØRSMÅL
    // -----------------------------
    const res = await fetch("/api/groq/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: userMsg,
      }),
    });

    const data = await res.json();

    setChat((prev) => [...prev, { sender: "ai", text: data.reply }]);
    setLoading(false);
  }

  // -----------------------------
  // NY FUNKSJON: JA / NEI KNAPPER
  // -----------------------------
  async function handleUtkastJa() {
    const res = await fetch("/api/groq/oppskrift", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        ingredients: ingredienser,
        stil,
        volume, // ⭐ NYTT
      }),
    });

    const data = await res.json();
    onFinish(data.oppskrift, { name, stil, volume }); // ⭐ NYTT
    onClose();
  }

  function handleUtkastNei() {
    setChat((prev) => [
      ...prev,
      { sender: "ai", text: "Bare si ifra når du vil at jeg skal lage utkastet." }
    ]);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-50 flex flex-col">
      <div className="p-6 border-b border-white/10">
        <h1 className="text-3xl font-bold text-white">Batchlogg's AI Oppskriftsbygger</h1>
        <p className="opacity-70">AI‑assistent for brygging og oppskrifter</p>
      </div>

      <div
        ref={chatRef}
        className="flex-1 overflow-y-auto p-6 space-y-4 text-white"
      >
        {chat.map((msg, i) => (
          <div
            key={i}
            className={`max-w-xl px-4 py-3 rounded-lg ${
              msg.sender === "ai"
                ? "bg-white/10 text-white self-start"
                : "bg-blue-600 text-white self-end ml-auto"
            }`}
          >
            {msg.text}
          </div>
        ))}

        {loading && (
          <div className="text-white opacity-70">Batchlogg AI tenker…</div>
        )}

        {/* ----------------------------- */}
        {/* NYTT: JA / NEI KNAPPER        */}
        {/* ----------------------------- */}
        {wizardStep === 5 && (
          <div className="flex gap-4 mt-4">
            <button
              onClick={handleUtkastJa}
              className="px-4 py-3 bg-green-700 hover:bg-green-600 rounded-lg font-semibold"
            >
              Ja
            </button>
            <button
              onClick={handleUtkastNei}
              className="px-4 py-3 bg-red-700 hover:bg-red-600 rounded-lg font-semibold"
            >
              Nei
            </button>
          </div>
        )}
      </div>

      <div className="p-6 border-t border-white/10 flex gap-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          className="flex-1 p-3 rounded bg-black/40 border border-white/20 text-white"
          placeholder="Skriv her… (Enter = send, Shift+Enter = linjeskift)"
        />
        <button
          onClick={sendMessage}
          className="px-4 py-3 bg-blue-700 hover:bg-blue-600 rounded-lg font-semibold"
        >
          Send
        </button>
        <button
          onClick={onClose}
          className="px-4 py-3 bg-red-700 hover:bg-red-600 rounded-lg font-semibold"
        >
          Lukk
        </button>
      </div>
    </div>
  );
}
