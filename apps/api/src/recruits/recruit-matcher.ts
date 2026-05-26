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
 */
export function isLevelRangeOverlapping(
  level1: number,
  tolerance1: number,
  level2: number,
  tolerance2: number,
): boolean {
  const min1 = Math.round((level1 - tolerance1) * 10);
  const max1 = Math.round((level1 + tolerance1) * 10);
  const min2 = Math.round((level2 - tolerance2) * 10);
  const max2 = Math.round((level2 + tolerance2) * 10);
  return Math.max(min1, min2) <= Math.min(max1, max2);
}
