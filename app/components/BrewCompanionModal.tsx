"use client";

import { useState, useEffect, useRef } from "react";

interface BrewCompanionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFinish: (
    draft: string,
    meta: { name: string; style: string; volume: string }
  ) => void;
}

export default function BrewCompanionModal({
  isOpen,
  onClose,
  onFinish,
}: BrewCompanionModalProps) {
  const [chat, setChat] = useState([
    {
      sender: "ai",
      text: "Hello! I’m BrewCompanion, just your friendly neighborhood homebrew assistant. What would you like us to make today?",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [style, setStyle] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [volume, setVolume] = useState("");

  const [showRecipeButtons, setShowRecipeButtons] = useState(false);

  const chatRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [chat]);

  function extractMetaFromAI(text: string) {
    if (!text || typeof text !== "string") return;

    const lower = text.toLowerCase();

    if (lower.includes("name:")) {
      const match = text.match(/name:\s*(.*)/i);
      if (match) setName(match[1].trim());
    }

    if (lower.includes("style:")) {
      const match = text.match(/style:\s*(.*)/i);
      if (match) setStyle(match[1].trim());
    }

    if (lower.includes("ingredients:")) {
      const match = text.match(/ingredients:\s*([\s\S]*?)(?:\n|$)/i);
      if (match) setIngredients(match[1].trim());
    }

    if (lower.includes("liter") || lower.includes("volume")) {
      const match = text.match(/(\d+)\s*liter/i);
      if (match) setVolume(match[1]);
    }
  }

  async function sendMessage() {
  if (!input.trim()) return;

  const userMsg = input.trim();
  setInput("");
  setLoading(true);

  // Funksjonell oppdatering – eneste måte å få riktig state
  setChat((prevChat) => {
    const updated = [...prevChat, { sender: "user", text: userMsg }];

    // Send til backend med korrekt state
    fetch("/api/groq/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: updated.slice(-10),
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        const reply = data.reply;

        setChat((prev2) => [...prev2, { sender: "ai", text: reply }]);
        extractMetaFromAI(reply);

        const normalized = reply.toLowerCase().trim();
        if (
          normalized === "should i generate the recipe?" ||
          normalized === "should i generate the recipe" ||
          normalized === "do you want me to generate the recipe?" ||
          normalized === "do you want me to generate the recipe"
        ) {
          setShowRecipeButtons(true);
        }

        setLoading(false);
      });

    return updated;
  });
}
  function resetChat() {
    setChat([
      {
        sender: "ai",
        text: "Hello! I’m BrewCompanion, just your friendly neighborhood homebrew assistant. What would you like us to make today?",
      },
    ]);

    setName("");
    setStyle("");
    setIngredients("");
    setVolume("");
    setShowRecipeButtons(false);
    setInput("");
  }

  async function handleGenerateYes() {
    const res = await fetch("/api/groq/oppskrift", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        ingredients,
        style,
        volume,
      }),
    });

    const data = await res.json();
    onFinish(data.oppskrift, { name, style, volume });
    onClose();
  }

  function handleGenerateNo() {
    setShowRecipeButtons(false);
    setChat((prev) => [
      ...prev,
      {
        sender: "ai",
        text: "No problem! Just let me know when you want me to generate the recipe.",
      },
    ]);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-50 flex flex-col">
      <div className="p-6 border-b border-white/10">
        <h1 className="text-3xl font-bold text-white">BrewCompanion</h1>
        <p className="opacity-70">
          Let me help you build recipes or answer questions about anything brew-related!
        </p>
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
          <div className="text-white opacity-70">BrewCompanion is thinking…</div>
        )}

        {showRecipeButtons && (
          <div className="flex gap-4 mt-4">
            <button
              onClick={handleGenerateYes}
              className="px-4 py-3 bg-green-700 hover:bg-green-600 rounded-lg font-semibold"
            >
              Yes, generate the recipe
            </button>
            <button
              onClick={handleGenerateNo}
              className="px-4 py-3 bg-red-700 hover:bg-red-600 rounded-lg font-semibold"
            >
              No
            </button>
          </div>
        )}
      </div>

      <div className="p-6 border-t border-white/10 flex gap-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          className="flex-1 p-3 rounded bg-black/40 border border-white/20 text-white resize-none"
          placeholder="Type here… (Enter = send, Shift+Enter = new line)"
          rows={3}
        />
        <button
         type="button"
        onClick={sendMessage}
        className="px-4 py-3 bg-blue-700 hover:bg-blue-600 rounded-lg font-semibold"
        >
          Send
        </button>
        <button
          onClick={onClose}
          className="px-4 py-3 bg-red-700 hover:bg-red-600 rounded-lg font-semibold"
        >
          Close
        </button>
        <button
          onClick={resetChat}
          className="px-4 py-3 bg-yellow-600 hover:bg-yellow-500 rounded-lg font-semibold"
        >
          New Chat
        </button>
      </div>
    </div>
  );
}
