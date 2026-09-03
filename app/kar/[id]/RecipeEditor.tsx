"use client";
import { useState, useRef, useEffect } from "react";

function AutoTextarea({ value, onChange, placeholder }: any) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.style.height = "auto";
    ref.current.style.height = ref.current.scrollHeight + "px";
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full p-3 rounded bg-black/40 border border-white/20 resize-none overflow-hidden"
    />
  );
}

export function RecipeEditor() {
  const [ingredients, setIngredients] = useState("");
  const [steps, setSteps] = useState("");
  const [notes, setNotes] = useState("");

  const combined = `
Ingredients:
${ingredients}

Full process:
${steps}

Notes:
${notes}
`.trim();

  return (
    <div className="space-y-4">
      <div>
        <label className="block mb-1 font-semibold">Ingredients</label>
        <AutoTextarea
          value={ingredients}
          onChange={setIngredients}
          placeholder="Please fill in all your ingredients"
          name="ingredients"
        />
      </div>

      <div>
        <label className="block mb-1 font-semibold">Full process</label>
        <AutoTextarea
          value={steps}
          onChange={setSteps}
          placeholder="Walk us through your full process"
          name="full_process"
        />
      </div>

      <div>
        <label className="block mb-1 font-semibold">Notes</label>
        <AutoTextarea
          value={notes}
          onChange={setNotes}
          placeholder="Additional notes..."
          name="notes"
        />
      </div>

      <input type="hidden" name="oppskrift" value={combined} />
    </div>
  );
}
