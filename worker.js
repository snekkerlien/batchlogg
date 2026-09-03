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

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(),
      });
    }

    // BrewCompanion endpoint
    if (url.pathname === "/brewcompanion" && request.method === "POST") {
      await ensureKnowledge();
      return handleBrewcompanion(request, env);
    }

    // Oppskrift endpoint
    if (url.pathname === "/oppskrift" && request.method === "POST") {
      return handleOppskrift(request, env);
    }

    return new Response("Not found", {
      status: 404,
      headers: corsHeaders(),
    });
  },
};

// CORS for Vercel frontend
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "http://localhost:3000",
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

  const ai = env.AI;

const result = await ai.run(
  "@cf/meta/llama-3.1-8b-instruct",
  {
    messages: [
      { role: "system", content: superPrompt },
      ...safeHistory,
      { role: "user", content: prompt }
    ]
  }
);

return new Response(
  JSON.stringify({ answer: result.response }),
  {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(),
    },
  }
);


    // --- FIX: Proper error handling ---
    if (!response.ok) {
      const errorText = await response.text();
      return new Response(
        JSON.stringify({ error: errorText }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders(),
          },
        }
      );
    }

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
