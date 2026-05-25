import { IsString, IsEnum, MinLength } from 'class-validator';
import { CourtType, CourtSurface } from '@prisma/client';

export class CreateCourtDto {
  @IsString()
  @MinLength(1)
  venueId!: string;

  @IsString()
  @MinLength(1)
  code!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsEnum(CourtType)
  type!: CourtType;

  @IsEnum(CourtSurface)
  surface!: CourtSurface;
}
