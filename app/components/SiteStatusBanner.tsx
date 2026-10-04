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
    <aside role="status" className="sticky top-0 z-[80] border-b border-amber-300/30 bg-amber-950/95 px-4 py-2 text-center text-sm text-amber-100">
      <span className="font-semibold">Service notice:</span> {message}
    </aside>
  );
}
