"use client";

import { useEffect, useState } from "react";
import type { FeatureToggle, FeatureToggleKey } from "@/lib/features/toggles";

export default function FeatureRolloutClient() {
  const [toggles, setToggles] = useState<FeatureToggle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadToggles();
  }, []);

  async function loadToggles() {
    try {
      const response = await fetch("/api/admin/feature-toggles");
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to load feature toggles (${response.status})`);
      }
      const data = await response.json();
      setToggles(data);
      setError(null);
    } catch (err) {
      console.error("Error loading toggles:", err);
      setError(err instanceof Error ? err.message : "Failed to load feature toggles");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(toggleKey: FeatureToggleKey, newValue: boolean) {
    setSaving((prev) => ({ ...prev, [toggleKey]: true }));

    try {
      const response = await fetch("/api/admin/feature-toggles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: toggleKey, enabled: newValue }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update feature toggle (${response.status}). Check the server logs.`);
      }

      const { toggle: updatedToggle, auditError }: { toggle: FeatureToggle; auditError: boolean } = await response.json();
      setToggles((prev) =>
        prev.map((t) => (t.key === toggleKey ? updatedToggle : t))
      );
      window.dispatchEvent(new Event("batchlogg-preferences-saved"));
      setError(auditError ? "The feature was updated, but the audit log could not be saved. Check the server logs." : null);
    } catch (err) {
      console.error("Error updating toggle:", err);
      setError(err instanceof Error ? err.message : "Failed to update feature toggle");
    } finally {
      setSaving((prev) => ({ ...prev, [toggleKey]: false }));
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block rounded-lg border border-white/10 bg-white/5 px-6 py-3">
          <p className="text-white/60">Loading feature toggles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-400/30 bg-red-950/40 p-4 text-red-200">
          {error}
        </div>
      )}

      {toggles.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-white/5 p-6 text-center">
          <p className="text-white/60">No feature toggles available.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {toggles.map((toggle) => (
            <div
              key={toggle.key}
              className="rounded-lg border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-green-200">{toggle.name}</h3>
                  {toggle.description && (
                    <p className="mt-1 text-sm text-white/60">{toggle.description}</p>
                  )}
                  {toggle.requires_developer_only && (
                    <p className="mt-2 inline-block rounded bg-purple-500/20 px-2 py-1 text-xs font-medium text-purple-200">
                      Developer Only
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleToggle(toggle.key, !toggle.enabled)}
                  disabled={saving[toggle.key] || false}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${
                    toggle.enabled
                      ? "bg-green-500/20 text-green-200 hover:bg-green-500/30 border border-green-500/30"
                      : "bg-red-500/20 text-red-200 hover:bg-red-500/30 border border-red-500/30"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {saving[toggle.key] ? "..." : toggle.enabled ? "Enabled" : "Disabled"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 rounded-lg border border-white/10 bg-white/5 p-4">
        <h3 className="font-semibold text-white mb-2">How it works</h3>
        <ul className="text-sm text-white/60 space-y-1 list-disc list-inside">
          <li>Developers can access disabled features for testing.</li>
          <li>Enable a feature when you are ready to release it.</li>
          <li>Changes are recorded in the audit log.</li>
        </ul>
      </div>
    </div>
  );
}
