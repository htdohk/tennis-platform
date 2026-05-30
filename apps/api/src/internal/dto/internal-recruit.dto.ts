import {
  IsString,
  IsDateString,
  IsNumber,
  IsInt,
  IsOptional,
  Min,
  Max,
} from 'class-validator';

export class CreateInternalRecruitDto {
  @IsString()
  wechatId!: string;

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

export class QueryRecruitsDto {
  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsNumber()
  minLevel?: number;

  @IsOptional()
  @IsNumber()
  maxLevel?: number;
}
