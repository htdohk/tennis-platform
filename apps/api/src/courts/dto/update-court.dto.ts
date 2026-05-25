import { IsString, IsOptional, IsEnum, MinLength } from 'class-validator';
import { CourtType, CourtSurface, CourtStatus } from '@prisma/client';

export class UpdateCourtDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  code?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsEnum(CourtType)
  type?: CourtType;

  @IsOptional()
  @IsEnum(CourtSurface)
  surface?: CourtSurface;

  @IsOptional()
  @IsEnum(CourtStatus)
  status?: CourtStatus;
}
