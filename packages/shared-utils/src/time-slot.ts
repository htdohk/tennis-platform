/**
 * Time slot utility functions.
 *
 * All bookings and court schedules operate on 30-minute granularity.
 * Times must be aligned to 30-minute boundaries (e.g., 10:00, 10:30, 11:00).
 */

const SLOT_MINUTES = 30;

/**
 * Check if a Date is aligned to a 30-minute boundary (minutes = 0 or 30, seconds = 0, ms = 0).
 */
export function isAlignedTo30Min(date: Date): boolean {
  const mins = date.getMinutes();
  const secs = date.getSeconds();
  const ms = date.getMilliseconds();
  return mins % SLOT_MINUTES === 0 && secs === 0 && ms === 0;
}

/**
 * Return the duration in minutes between start and end.
 * Throws if start >= end.
 */
export function getSlotDurationMinutes(start: Date, end: Date): number {
  if (start >= end) {
    throw new Error("start must be before end");
  }
  return (end.getTime() - start.getTime()) / 60_000;
}

/**
 * Check if two time ranges [aStart, aEnd) and [bStart, bEnd) overlap.
 * Touching boundaries (aEnd === bStart) do NOT count as overlap.
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
 * Align a Date forward to the next 30-minute boundary.
 * If already aligned, returns the same time.
 */
export function alignToNext30Min(date: Date): Date {
  const result = new Date(date);
  const mins = result.getMinutes();
  const remainder = mins % SLOT_MINUTES;
  if (remainder === 0 && result.getSeconds() === 0 && result.getMilliseconds() === 0) {
    return result;
  }
  result.setMinutes(mins - remainder + SLOT_MINUTES, 0, 0);
  return result;
}

/**
 * Align a Date backward to the previous 30-minute boundary.
 * If already aligned, returns the same time.
 */
export function alignToPrev30Min(date: Date): Date {
  const result = new Date(date);
  const mins = result.getMinutes();
  const remainder = mins % SLOT_MINUTES;
  if (remainder === 0 && result.getSeconds() === 0 && result.getMilliseconds() === 0) {
    return result;
  }
  result.setMinutes(mins - remainder, 0, 0);
  return result;
}
