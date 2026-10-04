"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import {
  UNIT_STORAGE_KEY,
  formatQuantity,
  fromDisplay,
  isUnitSystem,
  roundForDisplay,
  toDisplay,
  unitLabel,
  type UnitKind,
  type UnitSystem,
} from "@/lib/units";
import { useAuthContext } from "@/app/providers/AuthProvider";
import { supabaseBrowser } from "@/lib/supabase/supabaseBrowser";
import { savePreferredUnitSystem } from "@/app/actions/userPreferences";

// Several providers can be mounted at once (nested layouts), so keep them in sync within the same tab.
const UNIT_CHANGE_EVENT = "batchlog-unit-change";

type UnitsContextValue = {
  system: UnitSystem;
  setSystem: (system: UnitSystem) => void;
  saveError: string;
  label: (kind: UnitKind) => string;
};

const UnitsContext = createContext<UnitsContextValue>({
  system: "metric",
  setSystem: () => {},
  saveError: "",
  label: (kind) => unitLabel(kind, "metric"),
});

export function UnitsProvider({ children }: { children: ReactNode }) {
  const [system, setSystemState] = useState<UnitSystem>("metric");
  const [saveError, setSaveError] = useState("");
  const { user } = useAuthContext();

  useEffect(() => {
    const stored = window.localStorage.getItem(UNIT_STORAGE_KEY);
    if (isUnitSystem(stored)) setSystemState(stored);

    function onStorage(event: StorageEvent) {
      if (event.key === UNIT_STORAGE_KEY && isUnitSystem(event.newValue)) {
        setSystemState(event.newValue);
      }
    }
    function onLocalChange(event: Event) {
      const next = (event as CustomEvent<string>).detail;
      if (isUnitSystem(next)) setSystemState(next);
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener(UNIT_CHANGE_EVENT, onLocalChange);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(UNIT_CHANGE_EVENT, onLocalChange);
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (!user) return;

    supabaseBrowser
      .from("profiles")
      .select("preferred_unit_system")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error("Could not load preferred unit system", error);
          setSaveError("Could not load your saved unit preference.");
          return;
        }
        if (isUnitSystem(data?.preferred_unit_system)) {
          setSystemState(data.preferred_unit_system);
          window.localStorage.setItem(UNIT_STORAGE_KEY, data.preferred_unit_system);
        }
      });

    return () => {
      active = false;
    };
  }, [user?.id]);

  const setSystem = useCallback((next: UnitSystem) => {
    setSystemState(next);
    setSaveError("");
    window.localStorage.setItem(UNIT_STORAGE_KEY, next);
    window.dispatchEvent(new CustomEvent(UNIT_CHANGE_EVENT, { detail: next }));
    if (user) {
      void savePreferredUnitSystem(next).catch((error) => {
        console.error("Could not save preferred unit system", error);
        setSaveError("Your unit preference could not be saved.");
      });
    }
  }, [user]);

  const value = useMemo(
    () => ({
      system,
      setSystem,
      saveError,
      label: (kind: UnitKind) => unitLabel(kind, system),
    }),
    [system, setSystem, saveError]
  );

  return <UnitsContext.Provider value={value}>{children}</UnitsContext.Provider>;
}

export function useUnits() {
  return useContext(UnitsContext);
}

// Renders a stored metric value in the user's chosen unit system, e.g. "5 L" or "1.32 gal".
export function Qty({
  kind,
  value,
  fallback = "—",
  maxDecimals = 2,
}: {
  kind: UnitKind;
  value: number | string | null | undefined;
  fallback?: string;
  maxDecimals?: number;
}) {
  const { system } = useUnits();
  const formatted = formatQuantity(kind, value, system, maxDecimals);
  return <>{formatted ?? `${fallback} ${unitLabel(kind, system)}`}</>;
}

// Just the unit symbol for the current system, for use inside labels: Volume (<UnitSymbol kind="volume" />)
export function UnitSymbol({ kind }: { kind: UnitKind }) {
  const { label } = useUnits();
  return <>{label(kind)}</>;
}

type UnitInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "defaultValue" | "type" | "name"
> & {
  kind: UnitKind;
  // Name of the hidden field that is submitted, always holding the metric value.
  name?: string;
  // Controlled mode: a metric value as a string.
  value?: string;
  onValueChange?: (metricValue: string) => void;
  defaultValue?: string;
};

// Number input that is typed in the user's units but always reports metric values.
export function UnitInput({
  kind,
  name,
  value,
  onValueChange,
  defaultValue,
  placeholder,
  ...rest
}: UnitInputProps) {
  const { system } = useUnits();
  const initialMetric = value ?? defaultValue ?? "";
  const [metric, setMetric] = useState(initialMetric);
  const [draft, setDraft] = useState("");
  const [draftSystem, setDraftSystem] = useState<UnitSystem | null>(null);

  const currentMetric = value !== undefined ? value : metric;

  const shown = useMemo(() => {
    if (draftSystem === system) return draft;
    const numeric = Number(currentMetric);
    if (currentMetric === "" || !Number.isFinite(numeric)) return "";
    return String(roundForDisplay(toDisplay(kind, numeric, system), 3));
  }, [draft, draftSystem, system, currentMetric, kind]);

  function handleChange(text: string) {
    setDraft(text);
    setDraftSystem(system);
    const numeric = Number(text);
    const nextMetric =
      text === "" || !Number.isFinite(numeric)
        ? ""
        : String(roundForDisplay(fromDisplay(kind, numeric, system), 4));
    setMetric(nextMetric);
    onValueChange?.(nextMetric);
  }

  // Reset the typed draft when the unit system changes so the value is re-derived from metric.
  useEffect(() => {
    setDraftSystem(null);
  }, [system]);

  // Keep the draft in sync if a controlled parent changes the value externally.
  useEffect(() => {
    if (value === undefined) return;
    const numeric = Number(draft);
    const draftMetric =
      draft === "" || !Number.isFinite(numeric)
        ? ""
        : String(roundForDisplay(fromDisplay(kind, numeric, system), 4));
    if (draftMetric !== value) setDraftSystem(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <>
      <input
        {...rest}
        type="number"
        step="any"
        placeholder={placeholder}
        value={shown}
        onChange={(event) => handleChange(event.target.value)}
      />
      {name && <input type="hidden" name={name} value={currentMetric} />}
    </>
  );
}


export function UnitToggle({ className = "" }: { className?: string }) {
  const { system, setSystem, saveError } = useUnits();
  const options: { value: UnitSystem; label: string }[] = [
    { value: "metric", label: "Metric (L, kg)" },
    { value: "imperial", label: "Imperial (gal, lb)" },
  ];
  return (
    <div className={className}>
    <div role="group" aria-label="Unit system" className="flex justify-center gap-2">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => setSystem(option.value)}
          aria-pressed={system === option.value}
          className={`rounded-lg border px-4 py-2 text-sm font-semibold ${
            system === option.value
              ? "border-white/40 bg-white/20 text-white"
              : "border-white/15 bg-white/5 text-white/70 hover:bg-white/10"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
    {saveError && <p role="alert" className="mt-2 text-center text-sm text-red-300">{saveError}</p>}
    </div>
  );
}