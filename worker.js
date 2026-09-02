import { companionPrompt } from "./lib/BCLLM/companionPrompt.ts";
import { loadKnowledge } from "./lib/BCLLM/knowledge/loader.js";

let cachedKnowledge = null;
let superPrompt = null;

async function ensureKnowledge() {
  if (!cachedKnowledge) {
    cachedKnowledge = await loadKnowledge();
    superPrompt = `
${companionPrompt}

Here is brewing knowledge you can use:
${cachedKnowledge}
`;
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(),
      });
    }

    if (url.pathname === "/brewcompanion" && request.method === "POST") {
      await ensureKnowledge();
      return handleBrewcompanion(request, env);
    }

    if (url.pathname === "/oppskrift" && request.method === "POST") {
      return handleOppskrift(request, env);
    }

    return new Response("Not found", {
      status: 404,
      headers: corsHeaders(),
    });
  },
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "https://batchlogg.vercel.app",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

async function handleBrewcompanion(request, env) {
  try {
    const body = await request.json();
    const { prompt, history = [] } = body;

    const safeHistory = history.map((msg) => ({
      role: msg.role || "user",
      content:
        typeof msg.content === "string"
          ? msg.content
          : JSON.stringify(msg.content),
    }));

    const response = await fetch(env.CLOUDFLARE_WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemPrompt: superPrompt,
        prompt,
        history: safeHistory,
      }),
    });

    const data = await response.json();

    return new Response(
      JSON.stringify({ answer: data.answer }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders(),
        },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders(),
        },
      }
    );
  }
}

async function handleOppskrift(request, env) {
  // Midlertidig – du kan flytte logikken fra oppskrift.mjs hit senere
  return new Response(
    JSON.stringify({ message: "Oppskrift endpoint not implemented yet" }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders(),
      },
    }
  );
}
