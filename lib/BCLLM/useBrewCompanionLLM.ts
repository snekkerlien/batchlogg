"use client";

import { useEffect, useState } from "react";
import * as webllm from "@mlc-ai/web-llm";

export function useBrewCompanionLLM() {
  const [engine, setEngine] = useState<webllm.MLCEngine | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    (async () => {
      const eng = new webllm.MLCEngine();

      // progress callback (new API)
      eng.setInitProgressCallback((report) => {
        // report.progress = 0–1
        const pct = Math.floor(report.progress * 100);

        setProgress(pct);
        setLoading(pct < 100);
      });

      await eng.reload("Qwen2.5-1.5B-Instruct-q4f16_1-MLC");

      setEngine(eng);
      setLoading(false);
      setProgress(100);
    })();
  }, []);

  async function ask(prompt: string): Promise<string> {
    if (!engine) return "Model is still loading...";

    const result = await engine.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `
You are BrewCompanion. You always write brewing recipes in exactly the following format and never deviate from it:

Ingredients:
<plain text ingredients, one per line, no bullets, no numbering>

Full process:
<short paragraphs, plain text only, no lists, no numbering, no bullets>

Notes:
<plain text notes>

Use line separation between Ingredients, Full process and Notes.

You MUST NOT use the characters '#', '*', '-', or any digit followed by a period anywhere in your answer.
You MUST NOT use Markdown.
You MUST NOT add any extra sections.
You MUST ONLY output plain text with line breaks.

BREWING RULES:
Honey must never be boiled or heat treated.
Mead must never be cooked.
Mead must never contain malt extract unless the user explicitly asks.
Mead must never contain campden tablets or stabilizers unless the user explicitly asks.
Always use real mead yeast strains such as Lalvin D47, Lalvin 71B, EC-1118, K1-V1116, or similar.
When the user asks for yeast, always give real yeast strain names and offer alternatives.

You MUST follow this format and these rules even if the user asks for something else.
`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      stream: false
    });

    return result?.choices?.[0]?.message?.content ?? "";
  }

  return { ask, loading, progress };
}
