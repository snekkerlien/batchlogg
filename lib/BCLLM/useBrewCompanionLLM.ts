"use client";

import { engineStore, engine } from "./engineStore";
import { useSnapshot } from "valtio";
import { companionPrompt } from "./companionPrompt";
import { homebrewersMead } from "./knowledge/homebrewersassociation_mead.js";

export function useBrewCompanionLLM() {
  const snap = useSnapshot(engineStore);

  async function ask(
    prompt: string,
    history: { role: "assistant" | "user"; content: string }[] = []
  ): Promise<string> {
    if (!engine) return "Model is still loading...";

    const result = await engine.chat.completions.create({
      messages: [
        {
          role: "system",
          content: companionPrompt
        },

        {
          role: "system",
          content: homebrewersMead
        },

        ...history,

        {
          role: "user",
          content: prompt
        }
      ],

      temperature: 0.7,
      top_p: 0.9,
      stream: false
    });

    return result?.choices?.[0]?.message?.content ?? "";
  }

  return {
    ask,
    loading: snap.loading,
    progress: snap.progress
  };
}
