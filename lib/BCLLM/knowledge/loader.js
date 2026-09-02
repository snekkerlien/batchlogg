import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

// Fix __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function loadKnowledge() {
  const knowledgeDir = __dirname;
  const files = fs.readdirSync(knowledgeDir);

  let combined = "";

  for (const file of files) {
    if (file === "loader.js") continue;

    const fullPath = path.join(knowledgeDir, file);

    // Load JS knowledge files using dynamic import (ESM-safe)
    if (file.endsWith(".js")) {
      const fileUrl = pathToFileURL(fullPath).href;
      const module = await import(fileUrl);

      const content =
        module.default ||
        module[Object.keys(module)[0]];

      combined += `\n${content}\n`;
    }

    // Load text files
    if (file.endsWith(".txt") || file.endsWith(".md")) {
      const content = fs.readFileSync(fullPath, "utf8");
      combined += `\n${content}\n`;
    }
  }

  return combined.trim();
}
