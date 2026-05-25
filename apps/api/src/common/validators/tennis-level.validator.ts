import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'isValidTennisLevel', async: false })
export class IsValidTennisLevel implements ValidatorConstraintInterface {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  validate(value: unknown, _args: ValidationArguments): boolean {
    if (typeof value !== 'number' || isNaN(value) || value === null) {
      return false;
    }
    if (value < 1.0 || value > 5.0) {
      return false;
    }
    // Integer arithmetic to avoid floating-point precision issues
    return Math.round(value * 10) % 5 === 0;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  defaultMessage(_args: ValidationArguments): string {
    return '段位必须是 1.0-5.0 之间的数值,且步进为 0.5(如 1.0、1.5、2.0...)';
  }
}
