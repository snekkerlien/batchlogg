export type BrewMixEntry = { type: string; percent: number };

// Percentages are rounded with the largest-remainder method so they always sum to 100.
export function computeBrewMix(types: Array<string | null | undefined>): BrewMixEntry[] {
  const counts = new Map<string, number>();
  for (const raw of types) {
    const type = raw?.trim() || "Other";
    counts.set(type, (counts.get(type) ?? 0) + 1);
  }
  const total = types.length;
  if (total === 0) return [];

  const rows = [...counts].map(([type, count]) => {
    const exact = (count / total) * 100;
    return { type, count, percent: Math.floor(exact), remainder: exact - Math.floor(exact) };
  });
  let left = 100 - rows.reduce((sum, row) => sum + row.percent, 0);
  for (const row of [...rows].sort((a, b) => b.remainder - a.remainder)) {
    if (left <= 0) break;
    row.percent += 1;
    left -= 1;
  }
  return rows
    .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type))
    .map(({ type, percent }) => ({ type, percent }))
    .filter((row) => row.percent > 0);
}
