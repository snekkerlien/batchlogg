export type AdditionItem = {
  name: string;
  amount: string;
  unit: string;
};

export function parseRecipeAdditions(value: string): AdditionItem[] {
  if (!value.trim()) return [];

  return value
    .split(/\r?\n/)
    .map((line) => {
      const match = line.match(/^(.*?):\s*([0-9]+(?:[.,][0-9]+)?)(?:\s*(.*))?$/);
      if (!match) return { name: line, amount: "", unit: "" };
      return {
        name: match[1],
        amount: match[2],
        unit: match[3] ?? "",
      };
    })
    .filter((item) => item.name.trim() || item.amount.trim() || item.unit.trim());
}

export function formatRecipeAdditions(items: AdditionItem[]): string {
  return items
    .map(({ name, amount, unit }) => {
      const cleanName = name.trim();
      if (!cleanName) return "";
      return amount.trim()
        ? `${cleanName}: ${amount.trim()}${unit.trim() ? ` ${unit.trim()}` : ""}`
        : cleanName;
    })
    .filter(Boolean)
    .join("\n");
}
