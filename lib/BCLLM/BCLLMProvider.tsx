"use client";

import { createContext, useContext, useEffect, useState } from "react";
import * as webllm from "@mlc-ai/web-llm";

const BCLLMContext = createContext<any>(null);

export function BCLLMProvider({ children }: { children: React.ReactNode }) {
  const [engine, setEngine] = useState<webllm.MLCEngine | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const eng = new webllm.MLCEngine();
      await eng.reload("Qwen2.5-1.5B-Instruct-q4f16_1-MLC"); // last modellen automatisk
      setEngine(eng);
      setLoading(false);
    })();
  }, []);

  return (
    <BCLLMContext.Provider value={{ engine, loading }}>
      {children}
    </BCLLMContext.Provider>
  );
}

export function useBCLLM() {
  return useContext(BCLLMContext);
}
