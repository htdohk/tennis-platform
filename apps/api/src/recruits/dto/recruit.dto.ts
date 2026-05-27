import {
  IsString,
  IsDateString,
  IsNumber,
  IsInt,
  IsOptional,
  Min,
  Max,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'maxLevelGteMinLevel', async: false })
export class MaxLevelGteMinLevel implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments) {
    const obj = args.object as Record<string, number>;
    return obj.maxLevel >= obj.minLevel;
  }
  defaultMessage() {
    return 'maxLevel must be >= minLevel';
  }
}

export class PreviewMatchesDto {
  @IsDateString()
  date!: string;

  @IsDateString()
  startAt!: string;

  @IsDateString()
  endAt!: string;

  @IsNumber()
  @Min(1.0)
  @Max(5.0)
  minLevel!: number;

  @IsNumber()
  @Min(1.0)
  @Max(5.0)
  maxLevel!: number;
}

export class CreateRecruitDto {
  @IsString()
  courtId!: string;

  @IsDateString()
  startAt!: string;

  @IsDateString()
  endAt!: string;

  @IsNumber()
  @Min(1.0)
  @Max(5.0)
  minLevel!: number;

  @IsNumber()
  @Min(1.0)
  @Max(5.0)
  @Validate(MaxLevelGteMinLevel)
  maxLevel!: number;

  @IsInt()
  @Min(1)
  maxParticipants!: number;

  @IsDateString()
  deadline!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
