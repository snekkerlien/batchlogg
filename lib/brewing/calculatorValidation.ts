export function parseCalculatorNumber(value: string): number {
  return value.trim() ? Number(value.replace(",", ".")) : Number.NaN;
}

type CalculatorInput = {
  label: string;
  value: string;
  min?: number;
  max?: number;
  positive?: boolean;
};

export function getCalculatorInputError(inputs: CalculatorInput[]): string | null {
  for (const { label, value, min, max, positive } of inputs) {
    if (!value.trim()) continue;
    const number = parseCalculatorNumber(value);
    if (!Number.isFinite(number)) return `${label}: enter a valid finite number.`;
    if (positive && number <= 0) return `${label} must be greater than zero.`;
    if (min !== undefined && number < min) return `${label} must be at least ${min}.`;
    if (max !== undefined && number > max) return `${label} must be no more than ${max}.`;
  }
  return null;
}
