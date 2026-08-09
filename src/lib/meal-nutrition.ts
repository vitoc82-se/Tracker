// Shared nutrition math for meal item editing and AI-analysis correction.
// Kept pure and framework-free so both the client (meals page) and the API
// routes coerce numbers the same way.

/** Coerce an unknown value to a finite number, stripping unit suffixes like
 * "12g". Returns `fallback` (default 0) for anything non-numeric. */
export function coerceNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  if (typeof value === "string") {
    const match = value.replace(",", ".").match(/-?\d*\.?\d+/);
    if (match) {
      const n = parseFloat(match[0]);
      if (Number.isFinite(n)) return n;
    }
  }
  return fallback;
}

/** Parse a leading numeric amount from a quantity string. Handles plain
 * decimals ("250", "1.5") and simple fractions ("1/2" -> 0.5). Returns null
 * for non-numeric quantities ("a handful", "", "0" stays 0 so callers can
 * treat <= 0 as non-scalable). */
export function parseQuantity(quantity: string | null | undefined): number | null {
  if (quantity == null) return null;
  const q = quantity.trim().replace(",", ".");
  if (q === "") return null;
  const fraction = q.match(/^(\d*\.?\d+)\s*\/\s*(\d*\.?\d+)/);
  if (fraction) {
    const num = parseFloat(fraction[1]);
    const den = parseFloat(fraction[2]);
    if (Number.isFinite(num) && Number.isFinite(den) && den !== 0) return num / den;
    return null;
  }
  const decimal = q.match(/^-?\d*\.?\d+/);
  if (decimal) {
    const n = parseFloat(decimal[0]);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export interface ItemBase {
  baseQuantity: number | null;
  baseCalories: number;
  baseProtein: number;
  baseCarbs: number;
  baseFat: number;
}

/** True when an item's amount can be proportionally scaled: a finite base
 * quantity strictly greater than zero. */
export function isScalable(base: ItemBase): boolean {
  return base.baseQuantity != null && Number.isFinite(base.baseQuantity) && base.baseQuantity > 0;
}

/** Scale an item's macros from its stored base by a new numeric quantity.
 * Always computes from the base (never the current value) so repeated edits
 * do not compound rounding. Caller must ensure `isScalable(base)` first. */
export function scaleMacros(
  base: ItemBase,
  newQuantity: number
): { calories: number; protein: number; carbs: number; fat: number } {
  const factor = newQuantity / (base.baseQuantity as number);
  return {
    calories: base.baseCalories * factor,
    protein: base.baseProtein * factor,
    carbs: base.baseCarbs * factor,
    fat: base.baseFat * factor,
  };
}

export interface MacroCarrier {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

/** Single source of truth for meal totals derived from items. Empty list
 * yields zeros (not stale values). */
export function recomputeTotals(items: MacroCarrier[]): {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
} {
  return items.reduce<{ calories: number; protein: number; carbs: number; fat: number }>(
    (acc, item) => ({
      calories: acc.calories + coerceNumber(item.calories),
      protein: acc.protein + coerceNumber(item.protein),
      carbs: acc.carbs + coerceNumber(item.carbs),
      fat: acc.fat + coerceNumber(item.fat),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}
