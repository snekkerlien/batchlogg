"use client";

import { useEffect, useState } from "react";

export default function SiteStatusBanner() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    async function loadStatus() {
      try {
        const response = await fetch("/api/site-status", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load site status");
        if (active) setMessage(data.maintenanceNotice ?? "");
      } catch (error) {
        console.error("Could not load site status banner", error);
      }
    }
    void loadStatus();
    window.addEventListener("site-status-updated", loadStatus);
    const interval = window.setInterval(loadStatus, 60_000);
    return () => {
      active = false;
      window.removeEventListener("site-status-updated", loadStatus);
      window.clearInterval(interval);
    };
  }, []);

  if (!message) return null;
  return (
    <aside role="status" className="rounded-xl border border-amber-300/20 bg-black/60 px-4 py-2 text-center text-sm text-amber-100 backdrop-blur-md">
      <span className="font-semibold">Service notice:</span> {message}
    </aside>
  );
}
