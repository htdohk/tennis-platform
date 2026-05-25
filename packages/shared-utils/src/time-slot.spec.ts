import { describe, it, expect } from "vitest";
import {
  isAlignedTo30Min,
  getSlotDurationMinutes,
  isSlotsOverlapping,
  alignToNext30Min,
  alignToPrev30Min,
} from "./time-slot";

describe("isAlignedTo30Min", () => {
  it("returns true for o'clock times", () => {
    expect(isAlignedTo30Min(new Date("2026-06-01T10:00:00.000Z"))).toBe(true);
  });

  it("returns true for half-past times", () => {
    expect(isAlignedTo30Min(new Date("2026-06-01T10:30:00.000Z"))).toBe(true);
  });

  it("returns false for 10:15", () => {
    expect(isAlignedTo30Min(new Date("2026-06-01T10:15:00.000Z"))).toBe(false);
  });

  it("returns false when seconds not zero", () => {
    expect(isAlignedTo30Min(new Date("2026-06-01T10:00:30.000Z"))).toBe(false);
  });

  it("returns false when milliseconds not zero", () => {
    expect(isAlignedTo30Min(new Date("2026-06-01T10:00:00.500Z"))).toBe(false);
  });

  it("returns false for 10:05", () => {
    expect(isAlignedTo30Min(new Date("2026-06-01T10:05:00.000Z"))).toBe(false);
  });
});

describe("getSlotDurationMinutes", () => {
  it("returns 60 for a 1-hour slot", () => {
    expect(
      getSlotDurationMinutes(
        new Date("2026-06-01T10:00:00Z"),
        new Date("2026-06-01T11:00:00Z"),
      ),
    ).toBe(60);
  });

  it("returns 30 for a 30-min slot", () => {
    expect(
      getSlotDurationMinutes(
        new Date("2026-06-01T10:00:00Z"),
        new Date("2026-06-01T10:30:00Z"),
      ),
    ).toBe(30);
  });

  it("returns 90 for a 1.5-hour slot", () => {
    expect(
      getSlotDurationMinutes(
        new Date("2026-06-01T10:00:00Z"),
        new Date("2026-06-01T11:30:00Z"),
      ),
    ).toBe(90);
  });

  it("throws if start equals end", () => {
    const d = new Date("2026-06-01T10:00:00Z");
    expect(() => getSlotDurationMinutes(d, d)).toThrow("start must be before end");
  });

  it("throws if start is after end", () => {
    expect(() =>
      getSlotDurationMinutes(
        new Date("2026-06-01T11:00:00Z"),
        new Date("2026-06-01T10:00:00Z"),
      ),
    ).toThrow("start must be before end");
  });
});

describe("isSlotsOverlapping", () => {
  const a = [new Date("2026-06-01T10:00:00Z"), new Date("2026-06-01T11:00:00Z")] as const;

  it("returns false for non-overlapping (B after A)", () => {
    expect(
      isSlotsOverlapping(
        a[0], a[1],
        new Date("2026-06-01T11:00:00Z"),
        new Date("2026-06-01T12:00:00Z"),
      ),
    ).toBe(false);
  });

  it("returns false for non-overlapping (B before A)", () => {
    expect(
      isSlotsOverlapping(
        a[0], a[1],
        new Date("2026-06-01T09:00:00Z"),
        new Date("2026-06-01T10:00:00Z"),
      ),
    ).toBe(false);
  });

  it("returns true for fully contained B inside A", () => {
    expect(
      isSlotsOverlapping(
        a[0], a[1],
        new Date("2026-06-01T10:00:00Z"),
        new Date("2026-06-01T10:30:00Z"),
      ),
    ).toBe(true);
  });

  it("returns true for partial overlap (B starts before A ends)", () => {
    expect(
      isSlotsOverlapping(
        a[0], a[1],
        new Date("2026-06-01T10:30:00Z"),
        new Date("2026-06-01T11:30:00Z"),
      ),
    ).toBe(true);
  });

  it("returns true for A fully contained in B", () => {
    expect(
      isSlotsOverlapping(
        a[0], a[1],
        new Date("2026-06-01T09:00:00Z"),
        new Date("2026-06-01T12:00:00Z"),
      ),
    ).toBe(true);
  });

  it("returns true for exact same slot", () => {
    expect(
      isSlotsOverlapping(
        a[0], a[1],
        new Date("2026-06-01T10:00:00Z"),
        new Date("2026-06-01T11:00:00Z"),
      ),
    ).toBe(true);
  });
});

describe("alignToNext30Min", () => {
  it("returns same time if already aligned at :00", () => {
    const d = new Date("2026-06-01T10:00:00.000Z");
    expect(alignToNext30Min(d).getTime()).toBe(d.getTime());
  });

  it("returns same time if already aligned at :30", () => {
    const d = new Date("2026-06-01T10:30:00.000Z");
    expect(alignToNext30Min(d).getTime()).toBe(d.getTime());
  });

  it("aligns 10:15 to 10:30", () => {
    const result = alignToNext30Min(new Date("2026-06-01T10:15:00.000Z"));
    expect(result.getMinutes()).toBe(30);
    expect(result.getSeconds()).toBe(0);
  });

  it("aligns 10:45 to 11:00", () => {
    const result = alignToNext30Min(new Date("2026-06-01T10:45:00.000Z"));
    expect(result.getUTCHours()).toBe(11);
    expect(result.getUTCMinutes()).toBe(0);
  });

  it("aligns 23:45 to next day 00:00", () => {
    const result = alignToNext30Min(new Date("2026-06-01T23:45:00.000Z"));
    expect(result.getUTCHours()).toBe(0);
    expect(result.getUTCMinutes()).toBe(0);
  });
});

describe("alignToPrev30Min", () => {
  it("returns same time if already aligned at :00", () => {
    const d = new Date("2026-06-01T10:00:00.000Z");
    expect(alignToPrev30Min(d).getTime()).toBe(d.getTime());
  });

  it("returns same time if already aligned at :30", () => {
    const d = new Date("2026-06-01T10:30:00.000Z");
    expect(alignToPrev30Min(d).getTime()).toBe(d.getTime());
  });

  it("aligns 10:15 to 10:00", () => {
    const result = alignToPrev30Min(new Date("2026-06-01T10:15:00.000Z"));
    expect(result.getMinutes()).toBe(0);
  });

  it("aligns 10:45 to 10:30", () => {
    const result = alignToPrev30Min(new Date("2026-06-01T10:45:00.000Z"));
    expect(result.getMinutes()).toBe(30);
  });
});
