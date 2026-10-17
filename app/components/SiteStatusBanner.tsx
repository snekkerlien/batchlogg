"use client";

import { useEffect, useState } from "react";

export default function SiteStatusBanner() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    async function loadStatus() {
      try {
        const response = await fetch("/api/site-status");
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load site status");
        if (active) setMessage(data.maintenanceNotice ?? "");
      } catch (error) {
        console.error("Could not load site status banner", error);
      }
    }
    void loadStatus();
    window.addEventListener("site-status-updated", loadStatus);
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void loadStatus();
    };
    const interval = window.setInterval(refreshWhenVisible, 5 * 60_000);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      active = false;
      window.removeEventListener("site-status-updated", loadStatus);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, []);

  if (!message) return null;

  return (
    <aside
      role="status"
      className="rounded-xl border border-green-300/20 bg-black/60 px-4 py-2 text-center text-sm text-green-100 backdrop-blur-md"
    >
      <span className="font-semibold">Service notice:</span> {message}
    </aside>
  );
}
