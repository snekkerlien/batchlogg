import { invoke, isTauri } from "@tauri-apps/api/core";

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string" && error) return error;
  return fallback;
}

export async function saveDownload(blob: Blob, fileName: string) {
  if (isTauri()) {
    const contents = Array.from(new Uint8Array(await blob.arrayBuffer()));
    await invoke<boolean>("save_download", { fileName, contents });
    return;
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export { getErrorMessage };
