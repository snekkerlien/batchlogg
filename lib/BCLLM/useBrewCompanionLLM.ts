"use client";

export function useBrewCompanionLLM() {
  async function ask(
    prompt: string,
    history: { role: "assistant" | "user"; content: string }[] = []
  ): Promise<string> {

    try {
      const res = await fetch("/api/brewcompanion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ prompt, history })
      });

      if (!res.ok) {
        return "Server error: " + (await res.text());
      }

      const data = await res.json();
      return data.answer ?? "";
    } catch (err: any) {
      return "Request failed: " + err.message;
    }
  }

  return { ask };
}
