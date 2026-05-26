import { isLevelRangeOverlapping } from './recruit-matcher';

describe('isLevelRangeOverlapping', () => {
  it('exact same range overlaps', () => {
    expect(isLevelRangeOverlapping(3.5, 0.5, 3.5, 0.5)).toBe(true);
  });

  it('adjacent ranges touch (3.0±0.5 = [2.5,3.5], 3.5±0.5 = [3.0,4.0])', () => {
    // [2.5, 3.5] and [3.0, 4.0] overlap at 3.0-3.5
    expect(isLevelRangeOverlapping(3.0, 0.5, 3.5, 0.5)).toBe(true);
  });

  it('non-overlapping ranges (2.0±0.5 = [1.5,2.5], 4.0±0.5 = [3.5,4.5])', () => {
    expect(isLevelRangeOverlapping(2.0, 0.5, 4.0, 0.5)).toBe(false);
  });

  it('complete containment (3.0±1.0 = [2.0,4.0] contains 3.5±0.5 = [3.0,4.0])', () => {
    expect(isLevelRangeOverlapping(3.0, 1.0, 3.5, 0.5)).toBe(true);
  });

  it('exact boundary match (3.0±0.5=[2.5,3.5], 3.0±0.5=[2.5,3.5])', () => {
    expect(isLevelRangeOverlapping(3.0, 0.5, 3.0, 0.5)).toBe(true);
  });

  it('one point apart (2.0±0.5 = [1.5,2.5], 3.5±0.5 = [3.0,4.0])', () => {
    // [1.5, 2.5] and [3.0, 4.0] do NOT overlap
    expect(isLevelRangeOverlapping(2.0, 0.5, 3.5, 0.5)).toBe(false);
  });

  it('1.0±0.5=[0.5,1.5] and 2.0±0.5=[1.5,2.5] touch at exactly 1.5', () => {
    expect(isLevelRangeOverlapping(1.0, 0.5, 2.0, 0.5)).toBe(true);
  });
});
