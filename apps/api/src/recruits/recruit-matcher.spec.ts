import { isLevelRangeOverlapping } from './recruit-matcher';

describe('isLevelRangeOverlapping', () => {
  it('exact same range overlaps', () => {
    expect(isLevelRangeOverlapping(3.0, 4.0, 3.0, 4.0)).toBe(true);
  });

  it('adjacent ranges touch ([2.5,3.5] and [3.0,4.0])', () => {
    expect(isLevelRangeOverlapping(2.5, 3.5, 3.0, 4.0)).toBe(true);
  });

  it('non-overlapping ranges ([1.5,2.5] and [3.5,4.5])', () => {
    expect(isLevelRangeOverlapping(1.5, 2.5, 3.5, 4.5)).toBe(false);
  });

  it('complete containment ([2.0,4.0] contains [3.0,4.0])', () => {
    expect(isLevelRangeOverlapping(2.0, 4.0, 3.0, 4.0)).toBe(true);
  });

  it('exact boundary match ([2.5,3.5] and [2.5,3.5])', () => {
    expect(isLevelRangeOverlapping(2.5, 3.5, 2.5, 3.5)).toBe(true);
  });

  it('one point apart ([1.5,2.5] and [3.0,4.0])', () => {
    expect(isLevelRangeOverlapping(1.5, 2.5, 3.0, 4.0)).toBe(false);
  });

  it('[0.5,1.5] and [1.5,2.5] touch at exactly 1.5', () => {
    expect(isLevelRangeOverlapping(0.5, 1.5, 1.5, 2.5)).toBe(true);
  });
});
