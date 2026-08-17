"use client";
import { useState, useRef, useEffect } from "react";

function AutoTextarea({ value, onChange, placeholder, name }: any) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.style.height = "auto";
    ref.current.style.height = ref.current.scrollHeight + "px";
  }, [value]);

  return (
    <textarea
      ref={ref}
      name={name}   // 👈 KRITISK – gjør at formData ikke blir tom
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full p-2 rounded bg-zinc-800 border border-zinc-700 resize-none overflow-hidden"
    />
  );
}

export function RecipeEditor() {
  const [ingredients, setIngredients] = useState("");
  const [steps, setSteps] = useState("");
  const [notes, setNotes] = useState("");

  const combined = `
Ingredienser:
${ingredients}

Fremgangsmåte:
${steps}

Notater:
${notes}
`.trim();

  return (
    <div className="space-y-4">
      <div>
        <label className="block mb-1">Ingredienser</label>
        <AutoTextarea
          name="ingredients"   // 👈 viktig
          value={ingredients}
          onChange={setIngredients}
          placeholder="Skriv ingrediensene her..."
        />
      </div>

      <div>
        <label className="block mb-1">Fremgangsmåte</label>
        <AutoTextarea
          name="steps"   // 👈 viktig
          value={steps}
          onChange={setSteps}
          placeholder="Skriv steg-for-steg her..."
        />
      </div>

      <div>
        <label className="block mb-1">Notater</label>
        <AutoTextarea
          name="notes"   // 👈 viktig
          value={notes}
          onChange={setNotes}
          placeholder="Ekstra notater..."
        />
      </div>

      {/* Hidden input som sendes til server action */}
      <input type="hidden" name="oppskrift" value={combined} />
    </div>
  );
}
