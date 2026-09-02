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

    const safeHistory = history.map((msg) => ({
      role: msg.role || "user",
      content:
        typeof msg.content === "string"
          ? msg.content
          : JSON.stringify(msg.content)
    }));

    const knowledge = loadKnowledge();

    const response = await fetch(process.env.CLOUDFLARE_WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        history: safeHistory,
        systemPrompt: companionPrompt,
        knowledge
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return res
        .status(500)
        .json({ error: "Cloudflare Worker request failed", details: err });
    }

    const data = await response.json();
    const answer = data?.answer ?? "";

    return res.status(200).json({ answer });
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Server error", details: err.message });
  }
};
