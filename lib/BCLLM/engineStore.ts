import { proxy } from "valtio";
import * as webllm from "@mlc-ai/web-llm";

// Valtio kan IKKE proxy-wrappe MLCEngine.
// Derfor ligger engine utenfor proxy.
export let engine: webllm.MLCEngine | null = null;

// Proxy kun for UI-state
export const engineStore = proxy({
  loading: true,
  progress: 0
});

export async function preloadEngine() {
  // Hvis engine allerede finnes, ikke last på nytt
  if (engine) return;

  const eng = await webllm.CreateMLCEngine(
    "Phi-3.5-mini-instruct-q4f16_1-MLC",
    {
      initProgressCallback: (report) => {
        // report.progress er 0–1 og kan hoppe litt,
        // men er stabil nok når vi ikke lager egen prosent.
        engineStore.progress = report.progress;
        engineStore.loading = report.progress < 1;
      }
    }
  );

  // Lagre engine UTENFOR proxy for å unngå interruptSignal-feil
  engine = eng;

  // Ferdig lastet
  engineStore.loading = false;
  engineStore.progress = 1;
}
