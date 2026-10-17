export type SecondaryAdditionItem = {
  name: string;
  amount: string;
  unit: string;
};

export type SecondaryAdditions = {
  version: 1;
  additives: SecondaryAdditionItem[];
  fruits: SecondaryAdditionItem[];
  legacyText?: string;
};

function parseItems(value: unknown): SecondaryAdditionItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const row = item as Record<string, unknown>;
    if (typeof row.name !== "string") return [];
    return [{
      name: row.name,
      amount: typeof row.amount === "string" || typeof row.amount === "number"
        ? String(row.amount)
        : "",
      unit: typeof row.unit === "string" ? row.unit : "",
    }];
  });
}

export function parseSecondaryAdditions(value: unknown): SecondaryAdditions {
  if (typeof value !== "string" || !value.trim()) {
    return { version: 1, additives: [], fruits: [] };
  }

  try {
    const parsed: unknown = JSON.parse(value);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const record = parsed as Record<string, unknown>;
      if (record.version === 1) {
        return {
          version: 1,
          additives: parseItems(record.additives),
          fruits: parseItems(record.fruits),
          ...(typeof record.legacyText === "string" && record.legacyText.trim()
            ? { legacyText: record.legacyText }
            : {}),
        };
      }
    }
  } catch {
    // Existing recipes may contain plain-text secondary additions.
  }

  return {
    version: 1,
    additives: [],
    fruits: [],
    legacyText: value,
  };
}

export function formatSecondaryAdditions(value: unknown): string {
  const additions = parseSecondaryAdditions(value);
  const lines = [
    ...additions.fruits.flatMap(({ name, amount, unit }) =>
      name.trim()
        ? [`Fruit: ${name.trim()}${amount.trim() ? ` — ${amount.trim()}${unit.trim() ? ` ${unit.trim()}` : ""}` : ""}`]
        : []
    ),
    ...additions.additives.flatMap(({ name, amount, unit }) =>
      name.trim()
        ? [`${name.trim()}${amount.trim() ? ` — ${amount.trim()}${unit.trim() ? ` ${unit.trim()}` : ""}` : ""}`]
        : []
    ),
  ];
  if (additions.legacyText?.trim()) lines.push(additions.legacyText.trim());
  return lines.join("\n");
}
