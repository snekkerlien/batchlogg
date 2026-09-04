const companionPrompt = require("../../lib/BCLLM/companionPrompt");
const loadKnowledge = require("../../lib/BCLLM/knowledge/loader");

module.exports = async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { prompt, history = [] } = req.body;

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "Missing or invalid prompt" });
    }

    // Normalize history
    const safeHistory = history.map((msg) => ({
      role: msg.role || "user",
      content:
        typeof msg.content === "string"
          ? msg.content
          : JSON.stringify(msg.content)
    }));

    // Load your knowledge files
    const knowledge = loadKnowledge();

    // Build messages for OpenRouter
    const messages = [
      { role: "system", content: companionPrompt },
      ...safeHistory,
      { role: "user", content: prompt }
    ];

    // Call OpenRouter (MiniMax M3)
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": process.env.NODE_ENV === "development"
          ? "http://localhost:3000"
          : "https://batchlogg.no",
        "X-Title": "BrewCompanion"
      },
      body: JSON.stringify({
        model: "minimax/minimax-m3",
        messages,
        temperature: 0.7,
        extra_body: {
          knowledge // optional, but included since du bruker det
        }
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(500).json({
        error: "OpenRouter request failed",
        details: err
      });
    }

    const data = await response.json();
    const answer = data?.choices?.[0]?.message?.content ?? "";

    return res.status(200).json({ answer });

  } catch (err) {
    return res.status(500).json({
      error: "Server error",
      details: err.message
    });
  }
};
