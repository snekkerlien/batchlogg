"use client";

import { useEffect, useState } from "react";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import { UnitInput, UnitSymbol } from "@/app/components/Units";
import { getCalculatorInputError } from "@/lib/brewing/calculatorValidation";
import CalculatorResult from "./CalculatorResult";
import {
  calculateWaterTreatment,
  WATER_ION_LABELS,
  WATER_TARGET_PROFILES,
  type WaterIonProfile,
} from "@/lib/brewing/waterChemistry";

const IONS = Object.keys(WATER_ION_LABELS) as (keyof WaterIonProfile)[];

type SavedWaterProfile = {
  id: string;
  name: string;
  source_ions: WaterIonProfile;
  target_ions: WaterIonProfile;
};

function parseNonNegative(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function formatAmount(value: number): string {
  if (value === 0) return "0";
  return value < 0.1 ? value.toFixed(3) : value.toFixed(2);
}

export default function WaterChemistryCalculator() {
  const [volume, setVolume] = useState("");
  const [source, setSource] = useState<Record<keyof WaterIonProfile, string>>({
    calcium: "",
    magnesium: "",
    sodium: "",
    chloride: "",
    sulfate: "",
    bicarbonate: "",
  });
  const [targetName, setTargetName] = useState("");
  const [target, setTarget] = useState<Record<keyof WaterIonProfile, string>>({
    calcium: "",
    magnesium: "",
    sodium: "",
    chloride: "",
    sulfate: "",
    bicarbonate: "",
  });
  const [profiles, setProfiles] = useState<SavedWaterProfile[]>([]);
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
        const response = await fetch("/api/water-chemistry-profiles", {
          credentials: "include",
          cache: "no-store",
        });
        const result = (await response.json()) as {
          profiles?: SavedWaterProfile[];
          error?: string;
        };
        if (response.status === 401) return;
        if (!response.ok) {
          throw new Error(result.error || "Could not load water profiles.");
        }
        if (active) setProfiles(result.profiles ?? []);
      } catch (error) {
        console.error("Could not load water chemistry profiles", error);
        if (active) {
          setProfileError(
            error instanceof Error ? error.message : "Could not load water profiles."
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

  function applySavedProfile(profile: SavedWaterProfile) {
    setSelectedProfileId(profile.id);
    setSource(
      Object.fromEntries(
        IONS.map((ion) => [ion, String(profile.source_ions[ion])])
      ) as Record<keyof WaterIonProfile, string>
    );
    setTarget(
      Object.fromEntries(
        IONS.map((ion) => [ion, String(profile.target_ions[ion])])
      ) as Record<keyof WaterIonProfile, string>
    );
    setTargetName("Custom");
    setProfileError("");
    setProfileMessage(`Loaded ${profile.name}.`);
  }

  function currentProfileValues(name: string) {
    const sourceProfile = IONS.map((ion) => parseNonNegative(source[ion]));
    const targetValues = IONS.map((ion) => parseNonNegative(target[ion]));
    if (
      !name.trim() ||
      sourceProfile.some((value) => value === null) ||
      targetValues.some((value) => value === null)
    ) {
      throw new Error(
        "Enter a profile name and all six valid source and target ion values before saving."
      );
    }
    return {
      name: name.trim(),
      source_ions: Object.fromEntries(
        IONS.map((ion, index) => [ion, sourceProfile[index]])
      ) as WaterIonProfile,
      target_ions: Object.fromEntries(
        IONS.map((ion, index) => [ion, targetValues[index]])
      ) as WaterIonProfile,
    };
  }

  async function saveProfile(updateSelected: boolean) {
    if (profileBusy) return;
    setProfileBusy(true);
    setProfileError("");
    setProfileMessage("");
    try {
      const selected = profiles.find(
        (profile) => profile.id === selectedProfileId
      );
      const values = currentProfileValues(
        updateSelected ? selected?.name ?? "" : profileName
      );
      const response = await fetch("/api/water-chemistry-profiles", {
        method: updateSelected ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          updateSelected ? { id: selectedProfileId, ...values } : values
        ),
      });
      const result = (await response.json()) as {
        profile?: SavedWaterProfile;
        error?: string;
      };
      if (!response.ok || !result.profile) {
        throw new Error(result.error || "Could not save water profile.");
      }
      const saved = result.profile;
      setProfiles((current) =>
        [...current.filter((profile) => profile.id !== saved.id), saved].sort(
          (left, right) => left.name.localeCompare(right.name)
        )
      );
      setSelectedProfileId(saved.id);
      if (!updateSelected) setProfileName("");
      setProfileMessage(
        updateSelected ? `Updated ${saved.name}.` : `Saved ${saved.name}.`
      );
    } catch (error) {
      console.error("Could not save water chemistry profile", error);
      setProfileError(
        error instanceof Error ? error.message : "Could not save water profile."
      );
    } finally {
      setProfileBusy(false);
    }
  }

  async function deleteSelectedProfile(): Promise<boolean> {
    if (!selectedProfileId || profileBusy) return false;
    const selected = profiles.find(
      (profile) => profile.id === selectedProfileId
    );
    setProfileBusy(true);
    setProfileError("");
    setProfileMessage("");
    try {
      const response = await fetch(
        `/api/water-chemistry-profiles?id=${encodeURIComponent(selectedProfileId)}`,
        { method: "DELETE", credentials: "include" }
      );
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error || "Could not delete water profile.");
      }
      setProfiles((current) =>
        current.filter((profile) => profile.id !== selectedProfileId)
      );
      setSelectedProfileId("");
      setProfileMessage(`${selected?.name ?? "Water profile"} deleted.`);
      return true;
    } catch (error) {
      console.error("Could not delete water chemistry profile", error);
      setProfileError(
        error instanceof Error ? error.message : "Could not delete water profile."
      );
      return false;
    } finally {
      setProfileBusy(false);
    }
  }

  const sourceValues = IONS.map((ion) => parseNonNegative(source[ion]));
  const numericVolume = parseNonNegative(volume);
  const sourceProfile =
    sourceValues.every((value) => value !== null)
      ? (Object.fromEntries(
          IONS.map((ion, index) => [ion, sourceValues[index]])
        ) as WaterIonProfile)
      : null;
  const targetValues = IONS.map((ion) => parseNonNegative(target[ion]));
  const targetProfile =
    targetValues.every((value) => value !== null)
        ? (Object.fromEntries(
            IONS.map((ion, index) => [ion, targetValues[index]])
          ) as WaterIonProfile)
        : null;
  const plan =
    numericVolume !== null &&
    numericVolume > 0 &&
    sourceProfile &&
    targetProfile
        ? calculateWaterTreatment(sourceProfile, targetProfile, numericVolume)
        : null;
  const inputs = {
    "water volume": volume,
    ...Object.fromEntries(IONS.map(ion => [`source ${WATER_ION_LABELS[ion]}`, source[ion]])),
    ...Object.fromEntries(IONS.map(ion => [`target ${WATER_ION_LABELS[ion]}`, target[ion]])),
  };
  const inputError = getCalculatorInputError([
    { label: "Water volume", value: volume, positive: true },
    ...IONS.map(ion => ({ label: `Source ${WATER_ION_LABELS[ion]}`, value: source[ion], min: 0 })),
    ...IONS.map(ion => ({ label: `Target ${WATER_ION_LABELS[ion]}`, value: target[ion], min: 0 })),
  ]);
  const aboveTarget = sourceProfile && targetProfile
    ? IONS.filter(ion => sourceProfile[ion] > targetProfile[ion]).map(ion => WATER_ION_LABELS[ion])
    : [];

  function updateTarget(ion: keyof WaterIonProfile, value: string) {
    setTarget((current) => ({
        ...current,
        [ion]: value,
    }));
  }

  const additions: [string, number, "g" | "mL"][] = plan
    ? [
        ["Calcium chloride dihydrate", plan.additions.calciumChloride, "g"],
        ["Gypsum", plan.additions.gypsum, "g"],
        ["Epsom salt", plan.additions.epsomSalt, "g"],
        ["Baking soda", plan.additions.bakingSoda, "g"],
        ["88% lactic acid (estimate)", plan.additions.lacticAcid88, "mL"],
      ]
    : [];

  return (
    <section className="mt-12 rounded-xl border border-white/10 bg-white/5 p-6">
      <h2 className="mb-2 text-center text-2xl font-bold text-green-300">
        Water chemistry planner
      </h2>
      <p className="mb-6 text-center text-sm text-white/70">
        Compare a source-water analysis with a starting ion profile and estimate
        additions for your brewing-water volume.
      </p>
      <details className="mt-4 rounded-lg border border-white/10 bg-black/20 p-4">
        <summary className="flex cursor-pointer list-none items-start gap-2 text-sm font-semibold text-green-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-300">
          <span
            aria-hidden="true"
            className="disclosure-arrow mt-0.5 shrink-0 transition-transform"
          >
            &#9656;
          </span>
          <span className="min-w-0">Saved water profiles</span>
        </summary>
        <div className="mt-4">
          <p className="mb-3 text-xs text-white/55">
            Saves the source-water analysis and target ions together. Sign in
            to save profiles to your account.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              Load a saved profile
              <select
                value={selectedProfileId}
                onChange={(event) => {
                  const id = event.target.value;
                  setSelectedProfileId(id);
                  const profile = profiles.find((item) => item.id === id);
                  if (profile) applySavedProfile(profile);
                  else {
                    setProfileError("");
                    setProfileMessage("");
                  }
                }}
                disabled={profileLoading || profiles.length === 0}
                aria-label="Load a saved water profile"
                className="w-full rounded border border-white/20 bg-black/40 p-3 text-base disabled:opacity-60"
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
                placeholder="e.g. Home tap water"
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
              {profileBusy ? "Saving…" : "Save current water"}
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
        </div>
      </details>

      <details className="mt-3 rounded-lg border border-white/10 bg-black/20 p-4">
        <summary className="flex cursor-pointer list-none items-start gap-2 text-sm font-semibold text-green-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-300">
          <span
            aria-hidden="true"
            className="disclosure-arrow mt-0.5 shrink-0 transition-transform"
          >
            &#9656;
          </span>
          <span className="min-w-0">Where do I find these water values?</span>
        </summary>
        <div className="mt-3 space-y-3 text-sm leading-6 text-white/75">
          <p>
            <strong>Start with your water supplier.</strong> Search for
            &ldquo;water quality report&rdquo; or &ldquo;drinking water
            analysis&rdquo; plus your city or supplier name. Some suppliers let
            you search by postcode or address. Look for calcium, magnesium,
            sodium, chloride, sulfate, and alkalinity.
          </p>
          <p>
            <strong>For a private well, use a certified lab.</strong> Ask for a
            brewing water panel including those six values. If the report gives
            alkalinity as mg/L CaCO₃ rather than bicarbonate, multiply by 1.22
            and enter the result as bicarbonate. For example, 50 mg/L as CaCO₃
            is about 61 mg/L bicarbonate.
          </p>
          <p>
            Reports often show a range or an annual average, and water can vary
            by location and season. Use a recent report for your supply, and
            contact the supplier if you are unsure which values apply to your
            tap. A basic bottled-water label may not list all six ions.
          </p>
          <p>
            If you use reverse-osmosis or distilled water, enter zeros only
            when the product or your meter/test confirms it is effectively
            mineral-free; otherwise use its analysis. You can also leave this
            planner until you have a report and use the all-grain water planner
            without it.
          </p>
        </div>
      </details>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          Water volume to treat (<UnitSymbol kind="volume" />)
          <UnitInput
            kind="volume"
            value={volume}
            onValueChange={setVolume}
            min="0.1"
            step="any"
            placeholder="e.g. 30"
            className="w-full rounded border border-white/20 bg-black/40 p-3 text-base"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Starting target profile
          <select
            value={targetName}
            onChange={(event) => {
              const name = event.target.value;
              setTargetName(name);
              setSelectedProfileId("");
              setTarget(
                name === "Custom" || !name
                  ? {
                      calcium: "",
                      magnesium: "",
                      sodium: "",
                      chloride: "",
                      sulfate: "",
                      bicarbonate: "",
                    }
                  : Object.fromEntries(
                      IONS.map((ion) => [
                        ion,
                        String(WATER_TARGET_PROFILES[name][ion]),
                      ])
                    ) as Record<keyof WaterIonProfile, string>
              );
            }}
            className="w-full rounded border border-white/20 bg-black/40 p-3 text-base"
          >
            <option value="">Choose a starting profile</option>
            {Object.keys(WATER_TARGET_PROFILES).map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
            <option value="Custom">Custom</option>
          </select>
        </label>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <fieldset className="rounded-lg border border-white/10 p-4">
          <legend className="px-2 text-sm font-semibold text-green-200">
            Source water analysis (mg/L or ppm)
          </legend>
          <div className="grid grid-cols-2 gap-3">
            {IONS.map((ion) => (
              <label key={ion} className="flex flex-col gap-1 text-sm">
                {WATER_ION_LABELS[ion]}
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={source[ion]}
                  onChange={(event) =>
                    setSource((current) => ({
                      ...current,
                      [ion]: event.target.value,
                    }))
                  }
                  className="w-full rounded border border-white/20 bg-black/40 p-3 text-base"
                />
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="rounded-lg border border-white/10 p-4">
          <legend className="px-2 text-sm font-semibold text-green-200">
            Target ions (mg/L or ppm)
          </legend>
          <div className="grid grid-cols-2 gap-3">
            {IONS.map((ion) => (
              <label key={ion} className="flex flex-col gap-1 text-sm">
                {WATER_ION_LABELS[ion]}
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={target[ion]}
                  onChange={(event) => {
                    setTargetName("Custom");
                    setSelectedProfileId("");
                    updateTarget(ion, event.target.value);
                  }}
                  className="w-full rounded border border-white/20 bg-black/40 p-3 text-base"
                />
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <p className="mt-4 text-xs leading-5 text-white/55">
        Enter a water-report value for every source ion. The named profiles are
        editable starting points, not style rules. Salt additions target
        chloride, sulfate, magnesium, sodium, and bicarbonate; calcium is
        reported from those additions because these salts raise multiple ions.
        Salt assumptions are calcium chloride dihydrate, gypsum, Epsom salt
        heptahydrate, and baking soda. If your report gives alkalinity as CaCO₃,
        multiply it by 1.22 to estimate bicarbonate before entering it.
      </p>

      <CalculatorResult
        name="water chemistry planner"
        inputs={inputs}
        error={inputError}
        hasResult={plan !== null}
        assumptions="Uses calcium chloride dihydrate, gypsum, Epsom salt heptahydrate, baking soda, and 88% lactic acid. Additions affect multiple ions, so targets may not all be achievable. Calcium is predicted from the other additions, not independently targeted. The acid estimate neutralizes alkalinity only; it does not predict mash pH. Verify measurements and follow product guidance."
        resetDisabled={profileBusy}
        onReset={() => {
          setVolume("");
          setSource({ calcium: "", magnesium: "", sodium: "", chloride: "", sulfate: "", bicarbonate: "" });
          setTarget({ calcium: "", magnesium: "", sodium: "", chloride: "", sulfate: "", bicarbonate: "" });
          setTargetName(""); setSelectedProfileId(""); setProfileName("");
          setProfileError(""); setProfileMessage("");
        }}
      >
      {plan && (
        <>
          {aboveTarget.length > 0 && <p className="mb-3 text-sm text-amber-200">
            Already above target in the source water: {aboveTarget.join(", ")}. Salt additions cannot lower these values; this plan does not calculate dilution or mineral removal. The separate acid estimate may reduce bicarbonate.
          </p>}
          <div className="rounded-lg border border-white/10 bg-black/20 p-4">
            <h3 className="mb-3 font-semibold text-green-200">
              Estimated additions for the water volume entered above
            </h3>
            <ul className="grid gap-2 text-sm sm:grid-cols-2">
              {additions.map(([name, amount, unit]) => (
                <li key={name}>
                  <span className="text-white/70">{name}:</span>{" "}
                  <strong>{formatAmount(amount)} {unit}</strong>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-4 overflow-x-auto">
            <h3 className="mb-2 font-semibold text-green-200">
              Estimated water after salts (mg/L or ppm)
            </h3>
            <table className="w-full min-w-[440px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-white/60">
                  <th className="py-2 pr-3 font-medium">Ion</th>
                  <th className="px-3 py-2 font-medium">Target</th>
                  <th className="px-3 py-2 font-medium">Estimated</th>
                </tr>
              </thead>
              <tbody>
                {IONS.map((ion) => (
                  <tr key={ion} className="border-b border-white/5">
                    <th scope="row" className="py-2 pr-3 font-medium">
                      {WATER_ION_LABELS[ion]}
                    </th>
                    <td className="px-3 py-2">
                      {targetProfile![ion].toFixed(1)}
                    </td>
                    <td className="px-3 py-2">
                      {plan.predicted[ion].toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 rounded-lg border border-amber-300/20 bg-amber-300/5 p-3 text-xs leading-5 text-amber-100/80">
            Additions only raise ion levels. If a source value is already above
            its target, this planner does not calculate dilution or removal.
            Salt additions affect multiple ions, so the estimate may not match
            every target exactly. The lactic-acid figure assumes 88% acid and
            estimates alkalinity neutralization only; it is not a mash-pH
            prediction. Measure mash pH and follow product guidance before
            treating a full batch.
          </p>
        </>
      )}
      </CalculatorResult>
      <ConfirmDialog
        open={confirmDeleteProfile}
        title="Delete water profile?"
        message={`Delete "${profiles.find((profile) => profile.id === selectedProfileId)?.name ?? "this profile"}"? Current water values will not change.`}
        confirmLabel="Delete profile"
        onConfirm={deleteSelectedProfile}
        onCancel={() => setConfirmDeleteProfile(false)}
      />
    </section>
  );
}
