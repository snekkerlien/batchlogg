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

      // Kun én modell, stabil på både PC og mobil
      await eng.reload("Phi-3-mini-128k-instruct-q4f16_1-MLC");

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
