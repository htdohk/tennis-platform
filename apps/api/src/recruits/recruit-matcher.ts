/**
 * Check if two time ranges [aStart, aEnd) and [bStart, bEnd) overlap.
 * Touching boundaries (aEnd === bStart) do NOT count as overlap.
 * Inlined from @tennis/shared-utils to avoid cross-package import at runtime.
 */
export function isSlotsOverlapping(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Check if two level intervals overlap using integer arithmetic.
 * Each level is stored as Decimal(2,1), e.g. 3.5 → level*10 = 35.
 * Uses min/max range directly.
 */
export function isLevelRangeOverlapping(
  reqMin: number,
  reqMax: number,
  postMin: number,
  postMax: number,
): boolean {
  return Math.max(reqMin, postMin) <= Math.min(reqMax, postMax);
}

/**
 * Legacy: compute min/max from targetLevel ± tolerance.
 */
export function levelRangeFromTarget(targetLevel: number, tolerance: number): { min: number; max: number } {
  return { min: targetLevel - tolerance, max: targetLevel + tolerance };
}
