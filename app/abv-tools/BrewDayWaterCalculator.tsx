"use client";

import { useEffect, useMemo, useState } from "react";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import { Qty, UnitInput, UnitSymbol } from "@/app/components/Units";
import { calculateBrewWaterPlan } from "@/lib/brewing/waterPlanning";

type EquipmentProfile = {
  id: string;
  name: string;
  boil_off_rate_l_per_hour: number;
  kettle_loss_l: number;
  grain_absorption_l_per_kg: number;
  mash_ratio_l_per_kg: number;
  mash_tun_dead_space_l: number;
};

function toNumber(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

export default function BrewDayWaterCalculator() {
  const [targetVolume, setTargetVolume] = useState("");
  const [boilTime, setBoilTime] = useState("");
  const [boilOffRate, setBoilOffRate] = useState("");
  const [kettleLoss, setKettleLoss] = useState("");
  const [grainBill, setGrainBill] = useState("");
  const [grainAbsorption, setGrainAbsorption] = useState("");
  const [mashRatio, setMashRatio] = useState("");
  const [tunDeadSpace, setTunDeadSpace] = useState("");
  const [profiles, setProfiles] = useState<EquipmentProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [profileName, setProfileName] = useState("");
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const [confirmDeleteProfile, setConfirmDeleteProfile] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadProfiles() {
      try {
        const response = await fetch("/api/equipment-profiles", {
          credentials: "include",
          cache: "no-store",
        });
        const result = (await response.json()) as {
          profiles?: EquipmentProfile[];
          error?: string;
        };
        if (response.status === 401) return;
        if (!response.ok) throw new Error(result.error || "Could not load equipment profiles.");
        if (active) setProfiles(result.profiles ?? []);
      } catch (error) {
        console.error("Could not load equipment profiles", error);
        if (active) {
          setProfileError(
            error instanceof Error ? error.message : "Could not load equipment profiles."
          );
        }
      } finally {
        if (active) setProfileLoading(false);
      }
    }

    void loadProfiles();
    return () => {
      active = false;
    };
  }, []);

  function applyProfile(profile: EquipmentProfile) {
    setSelectedProfileId(profile.id);
    setBoilOffRate(String(profile.boil_off_rate_l_per_hour));
    setKettleLoss(String(profile.kettle_loss_l));
    setGrainAbsorption(String(profile.grain_absorption_l_per_kg));
    setMashRatio(String(profile.mash_ratio_l_per_kg));
    setTunDeadSpace(String(profile.mash_tun_dead_space_l));
    setProfileError("");
    setProfileMessage(`Loaded ${profile.name}.`);
  }

  function currentProfileValues(name: string) {
    const numericBoilOff = toNumber(boilOffRate);
    const numericKettleLoss = toNumber(kettleLoss);
    const numericAbsorption = toNumber(grainAbsorption);
    const numericMashRatio = toNumber(mashRatio);
    const numericDeadSpace = toNumber(tunDeadSpace);
    if (
      !name.trim() ||
      numericBoilOff === null ||
      numericKettleLoss === null ||
      numericAbsorption === null ||
      numericMashRatio === null ||
      numericDeadSpace === null
    ) {
      throw new Error("Enter a profile name and valid equipment settings before saving.");
    }
    return {
      name: name.trim(),
      boil_off_rate_l_per_hour: numericBoilOff,
      kettle_loss_l: numericKettleLoss,
      grain_absorption_l_per_kg: numericAbsorption,
      mash_ratio_l_per_kg: numericMashRatio,
      mash_tun_dead_space_l: numericDeadSpace,
    };
  }

  async function saveProfile(updateSelected: boolean) {
    if (profileBusy) return;
    setProfileBusy(true);
    setProfileError("");
    setProfileMessage("");
    try {
      const selected = profiles.find((profile) => profile.id === selectedProfileId);
      const name = updateSelected ? selected?.name ?? "" : profileName;
      const values = currentProfileValues(name);
      const response = await fetch("/api/equipment-profiles", {
        method: updateSelected ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          updateSelected ? { id: selectedProfileId, ...values } : values
        ),
      });
      const result = (await response.json()) as {
        profile?: EquipmentProfile;
        error?: string;
      };
      if (!response.ok || !result.profile) {
        throw new Error(result.error || "Could not save equipment profile.");
      }
      const saved = result.profile;
      setProfiles((current) => {
        const withoutSaved = current.filter((profile) => profile.id !== saved.id);
        return [...withoutSaved, saved].sort((left, right) =>
          left.name.localeCompare(right.name)
        );
      });
      setSelectedProfileId(saved.id);
      if (!updateSelected) setProfileName("");
      setProfileMessage(
        updateSelected ? `Updated ${saved.name}.` : `Saved ${saved.name}.`
      );
    } catch (error) {
      console.error("Could not save equipment profile", error);
      setProfileError(
        error instanceof Error ? error.message : "Could not save equipment profile."
      );
    } finally {
      setProfileBusy(false);
    }
  }

  async function deleteSelectedProfile(): Promise<boolean> {
    if (!selectedProfileId || profileBusy) return false;
    const selected = profiles.find((profile) => profile.id === selectedProfileId);
    setProfileBusy(true);
    setProfileError("");
    setProfileMessage("");
    try {
      const response = await fetch(
        `/api/equipment-profiles?id=${encodeURIComponent(selectedProfileId)}`,
        { method: "DELETE", credentials: "include" }
      );
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not delete equipment profile.");
      setProfiles((current) =>
        current.filter((profile) => profile.id !== selectedProfileId)
      );
      setSelectedProfileId("");
      setProfileMessage(`${selected?.name ?? "Equipment profile"} deleted.`);
      return true;
    } catch (error) {
      console.error("Could not delete equipment profile", error);
      setProfileError(
        error instanceof Error ? error.message : "Could not delete equipment profile."
      );
      return false;
    } finally {
      setProfileBusy(false);
    }
  }

  const values = [
    targetVolume,
    boilTime,
    boilOffRate,
    kettleLoss,
    grainBill,
    grainAbsorption,
    mashRatio,
    tunDeadSpace,
  ];
  const parsed = values.map(toNumber);
  const hasIncompleteValues = parsed.some((value) => value === null);
  const result = useMemo(() => {
    if (hasIncompleteValues) return null;
    return calculateBrewWaterPlan({
      targetFermenterVolumeL: parsed[0]!,
      boilTimeMinutes: parsed[1]!,
      boilOffRateLPerHour: parsed[2]!,
      kettleLossL: parsed[3]!,
      grainBillKg: parsed[4]!,
      grainAbsorptionLPerKg: parsed[5]!,
      mashRatioLPerKg: parsed[6]!,
      mashTunDeadSpaceL: parsed[7]!,
    });
  }, [hasIncompleteValues, ...parsed]);

  return (
    <section className="mt-12 rounded-xl border border-white/10 bg-white/5 p-6">
      <h2 className="mb-2 text-center text-2xl font-bold text-green-300">
        All-grain water planner
      </h2>
      <p className="mb-6 text-center text-sm text-white/70">
        Estimate strike, sparge, and pre-boil volumes from your target yield and
        equipment losses.
      </p>
      <details className="mb-6 rounded-lg border border-white/10 bg-black/20 p-4">
        <summary className="flex cursor-pointer list-none items-start gap-2 text-sm font-semibold text-green-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-300">
          <span
            aria-hidden="true"
            className="disclosure-arrow mt-0.5 shrink-0 transition-transform"
          >
            &#9656;
          </span>
          <span className="min-w-0">Saved equipment profiles</span>
        </summary>
        <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <label className="flex flex-col gap-1 text-sm">
            Load a profile
            <select
              value={selectedProfileId}
              onChange={(event) => {
                const id = event.target.value;
                setSelectedProfileId(id);
                const profile = profiles.find((candidate) => candidate.id === id);
                if (profile) applyProfile(profile);
                else {
                  setProfileError("");
                  setProfileMessage("");
                }
              }}
              disabled={profileLoading || profiles.length === 0}
              className="w-full rounded border border-white/20 bg-black/40 p-3 text-base disabled:opacity-60"
              aria-label="Load a saved equipment profile"
            >
              <option value="">
                {profileLoading
                  ? "Loading profiles…"
                  : profiles.length
                    ? "Choose a profile"
                    : "No saved profiles"}
              </option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            New profile name
            <input
              value={profileName}
              onChange={(event) => setProfileName(event.target.value)}
              maxLength={80}
              placeholder="e.g. 30 L BIAB kettle"
              className="w-full rounded border border-white/20 bg-black/40 p-3 text-base"
            />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void saveProfile(false)}
            disabled={profileBusy}
            className="rounded-lg border border-green-500 bg-green-700 px-3 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {profileBusy ? "Saving…" : "Save current settings"}
          </button>
          <button
            type="button"
            onClick={() => void saveProfile(true)}
            disabled={profileBusy || !selectedProfileId}
            className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold disabled:opacity-50"
          >
            Update selected profile
          </button>
          <button
            type="button"
            onClick={() => setConfirmDeleteProfile(true)}
            disabled={profileBusy || !selectedProfileId}
            className="rounded-lg border border-red-400/30 bg-red-900/30 px-3 py-2 text-sm font-semibold text-red-100 disabled:opacity-50"
          >
            Delete selected profile
          </button>
        </div>
        {profileError && (
          <p role="alert" className="mt-3 text-sm text-amber-200">
            {profileError}
          </p>
        )}
        {profileMessage && (
          <p role="status" className="mt-3 text-sm text-green-200">
            {profileMessage}
          </p>
        )}
      </details>

      <details className="mb-6 rounded-lg border border-white/10 bg-black/20 p-4">
        <summary className="flex cursor-pointer list-none items-start gap-2 text-sm font-semibold text-green-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-300">
          <span
            aria-hidden="true"
            className="disclosure-arrow mt-0.5 shrink-0 transition-transform"
          >
            &#9656;
          </span>
          <span className="min-w-0">How do I measure my equipment values?</span>
        </summary>
        <div className="mt-3 space-y-3 text-sm leading-6 text-white/75">
          <p>
            <strong>Boil-off rate:</strong> Measure the kettle volume before
            and after a timed boil, then divide the volume lost by the boil
            duration in hours. For example, losing 3 L in a one-hour boil is
            3 L/hour. Repeat with your usual heat level and kettle setup.
          </p>
          <p>
            <strong>Kettle / trub loss:</strong> After transferring wort the way
            you normally brew, measure the liquid left behind with the trub.
            Use the same method each time; this is separate from water
            evaporated during the boil.
          </p>
          <p>
            <strong>Mash tun dead space:</strong> Add a measured amount of water
            to the tun, drain it as you do on brew day, and measure what remains
            below the outlet. Grain absorption is separate: estimate it over a
            brew by subtracting collected wort and tun dead space from the
            mash-and-sparge water used, then divide by the grain bill weight.
          </p>
          <p>
            <strong>Mash ratio and grain bill:</strong> Use the grain amount
            from your recipe. Mash ratio is mash water per kilogram of grain;
            use your recipe or brewing method’s chosen ratio. It is a planning
            choice, not a fixed equipment measurement.
          </p>
          <p>
            Your measurements will vary with boil vigor, grain crush, draining
            time, and technique. Treat one brew as a starting point and refine
            the values over a few consistent batches.
          </p>
        </div>
      </details>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          Target volume into fermenter (<UnitSymbol kind="volume" />)
          <UnitInput
            kind="volume"
            value={targetVolume}
            onValueChange={setTargetVolume}
            min="0.1"
            step="any"
            placeholder="e.g. 20"
            className="w-full rounded border border-white/20 bg-black/40 p-3 text-base"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Boil time (minutes)
          <input
            type="number"
            min="1"
            step="1"
            value={boilTime}
            onChange={(event) => setBoilTime(event.target.value)}
            placeholder="e.g. 60"
            className="w-full rounded border border-white/20 bg-black/40 p-3 text-base"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Boil-off rate (<UnitSymbol kind="volume" /> per hour)
          <UnitInput
            kind="volume"
            value={boilOffRate}
            onValueChange={setBoilOffRate}
            min="0"
            step="any"
            placeholder="Measure for your kettle"
            className="w-full rounded border border-white/20 bg-black/40 p-3 text-base"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Kettle / trub loss (<UnitSymbol kind="volume" />)
          <UnitInput
            kind="volume"
            value={kettleLoss}
            onValueChange={setKettleLoss}
            min="0"
            step="any"
            placeholder="e.g. 2"
            className="w-full rounded border border-white/20 bg-black/40 p-3 text-base"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Grain bill (<UnitSymbol kind="kg" />)
          <UnitInput
            kind="kg"
            value={grainBill}
            onValueChange={setGrainBill}
            min="0"
            step="any"
            placeholder="e.g. 5"
            className="w-full rounded border border-white/20 bg-black/40 p-3 text-base"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Grain absorption (L per kg)
          <input
            type="number"
            min="0"
            step="any"
            value={grainAbsorption}
            onChange={(event) => setGrainAbsorption(event.target.value)}
            className="w-full rounded border border-white/20 bg-black/40 p-3 text-base"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Mash ratio (L per kg)
          <input
            type="number"
            min="0.1"
            step="any"
            value={mashRatio}
            onChange={(event) => setMashRatio(event.target.value)}
            className="w-full rounded border border-white/20 bg-black/40 p-3 text-base"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Mash tun dead space (<UnitSymbol kind="volume" />)
          <UnitInput
            kind="volume"
            value={tunDeadSpace}
            onValueChange={setTunDeadSpace}
            min="0"
            step="any"
            placeholder="Measure for your mash tun"
            className="w-full rounded border border-white/20 bg-black/40 p-3 text-base"
          />
        </label>
      </div>

      <p className="mt-4 text-xs leading-5 text-white/50">
        Enter measured values for your own equipment. This estimate assumes
        single-infusion all-grain brewing and does not account for decoction,
        top-up water, or changes in grain absorption.
      </p>

      {result ? (
        <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            ["Mash water", result.mashWaterL],
            ["Sparge water", result.spargeWaterL],
            ["Total water", result.totalWaterL],
            ["Pre-boil volume", result.preBoilVolumeL],
            ["Boil-off", result.boilOffL],
          ].map(([label, value]) => (
            <div
              key={label as string}
              className="rounded-lg border border-white/10 bg-black/20 p-3 text-center"
            >
              <dt className="text-xs uppercase tracking-wide text-white/50">
                {label}
              </dt>
              <dd className="mt-1 text-lg font-semibold text-white">
                <Qty kind="volume" value={value as number} />
              </dd>
            </div>
          ))}
        </dl>
      ) : !hasIncompleteValues && parsed.every((value) => value !== null) ? (
        <p role="alert" className="mt-5 text-center text-sm text-amber-200">
          Check the values: target volume, boil time, and mash ratio must be
          greater than zero, and the calculated sparge volume cannot be
          negative.
        </p>
      ) : (
        <p className="mt-5 text-center text-sm text-white/50">
          Enter your target volume, boil settings, grain bill, and equipment
          losses to see the water plan.
        </p>
      )}
      <ConfirmDialog
        open={confirmDeleteProfile}
        title="Delete equipment profile?"
        message={`Delete "${profiles.find((profile) => profile.id === selectedProfileId)?.name ?? "this profile"}"? The current calculator values will not change.`}
        confirmLabel="Delete profile"
        onConfirm={deleteSelectedProfile}
        onCancel={() => setConfirmDeleteProfile(false)}
      />
    </section>
  );
}
