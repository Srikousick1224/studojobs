export type PayUnit = "hour" | "month" | "year";

export interface PayInput {
  amount: number;
  unit: PayUnit;
  hoursPerWeek: number;
}

export interface PayResult {
  hour: number;
  week: number;
  month: number;
  year: number;
}

const WEEKS_PER_YEAR = 52;

/** Converts one pay figure into every other period. Assumes 52 working weeks and 12 equal months. */
export function convertPay({ amount, unit, hoursPerWeek }: PayInput): PayResult | null {
  if (!Number.isFinite(amount) || amount < 0 || !Number.isFinite(hoursPerWeek) || hoursPerWeek <= 0 || hoursPerWeek > 84) return null;
  const hoursPerYear = hoursPerWeek * WEEKS_PER_YEAR;
  const year = unit === "year" ? amount : unit === "month" ? amount * 12 : amount * hoursPerYear;
  return { year, month: year / 12, week: year / WEEKS_PER_YEAR, hour: year / hoursPerYear };
}

/** Lakh per annum, the unit Indian job posts use. */
export function toLpa(yearly: number): number {
  return yearly / 100000;
}
