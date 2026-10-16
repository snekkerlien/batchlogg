const appUrl = "https://batchlogg.vercel.app/?desktopApp=1";
const status = document.getElementById("status");
const retry = document.getElementById("retry");

async function openBatchlogg() {
  retry.hidden = true;
  retry.disabled = true;
  status.textContent = "Connecting to Batchlogg…";

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(appUrl, {
      method: "HEAD",
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error("The site is unavailable.");
    window.location.replace(appUrl);
  } catch {
    status.textContent =
      "Batchlogg needs an internet connection. Check your connection and try again.";
    retry.hidden = false;
  } finally {
    window.clearTimeout(timeout);
    retry.disabled = false;
  }
}

retry.addEventListener("click", openBatchlogg);
void openBatchlogg();
