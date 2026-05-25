import { IsValidTennisLevel } from './tennis-level.validator';
import { validate, Validate } from 'class-validator';

class TestDto {
  @Validate(IsValidTennisLevel)
  level!: number;
}

async function check(value: unknown): Promise<boolean> {
  const dto = new TestDto();
  dto.level = value as number;
  const errors = await validate(dto);
  return errors.length === 0;
}

describe('IsValidTennisLevel', () => {
  const valid = [1.0, 1.5, 2.0, 3.5, 4.0, 4.5, 5.0];
  const invalid = [0.5, 5.5, 6.0, 1.1, 3.3, 3.7, NaN, null, undefined, '3.5'];

  it.each(valid)('accepts %s', async (v) => {
    expect(await check(v)).toBe(true);
  });

  it.each(invalid)('rejects %s', async (v) => {
    expect(await check(v)).toBe(false);
  });
});
