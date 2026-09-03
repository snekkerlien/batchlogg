import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import oppskriftRoute from "./oppskrift.mjs";

// Fix __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local
dotenv.config({
  path: path.resolve(__dirname, "..", ".env.local")
});

// Import backend modules
import { loadKnowledge } from "../lib/BCLLM/knowledge/loader.js";
import { companionPrompt } from "../lib/BCLLM/companionPrompt.ts";

const app = express();

// CORS + JSON parsing
app.use(cors({
  origin: "https://batchlogg.vercel.app",
  methods: ["POST"],
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/oppskrift", oppskriftRoute);

// ⭐ Load knowledge ONCE at startup
const knowledge = await loadKnowledge();

// ⭐ Build superPrompt ONCE
const superPrompt = `
${companionPrompt}

Here is brewing knowledge you can use:
${knowledge}
`;

app.post("/brewcompanion", async (req, res) => {
  try {
    const { prompt, history = [] } = req.body;

    const safeHistory = history.map((msg) => ({
      role: msg.role || "user",
      content:
        typeof msg.content === "string"
          ? msg.content
          : JSON.stringify(msg.content)
    }));

    const response = await fetch(process.env.CLOUDFLARE_WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
      model: "@cf/meta/llama-3.1-8b-instruct",
      messages: [
     { role: "system", content: superPrompt },
         ...safeHistory,
    { role: "user", content: prompt }
  ]
}),
    });

    const data = await response.json();
    res.json({ answer: data.answer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3001, () => console.log("BrewCompanion server running on 3001"));
