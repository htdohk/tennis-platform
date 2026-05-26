import {
  IsString,
  IsDateString,
  IsNumber,
  IsInt,
  IsOptional,
  Min,
  Max,
} from 'class-validator';

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
  level!: number;

  @IsNumber()
  @Min(0)
  @Max(2.0)
  tolerance!: number;
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
  targetLevel!: number;

  @IsNumber()
  @Min(0)
  @Max(2.0)
  levelTolerance!: number;

  @IsInt()
  @Min(1)
  maxParticipants!: number;

  @IsDateString()
  deadline!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
