"use client";

import { createContext, useContext, useEffect, useState } from "react";
import * as webllm from "@mlc-ai/web-llm";

const BCLLMContext = createContext<any>(null);

function isMobile() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function BCLLMProvider({ children }: { children: React.ReactNode }) {
  const [engine, setEngine] = useState<webllm.MLCEngine | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const eng = new webllm.MLCEngine();

      // PC = full modell, mobil = fallback
      const modelName = isMobile()
        ? "Phi3-mini-128k-instruct-q4f16_1-MLC"
        : "Phi3-mini-4k-instruct-q4f16_1-MLC";

      await eng.reload(modelName);

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
