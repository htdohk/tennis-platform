import { IsString, IsDateString, IsOptional } from 'class-validator';

export class CreateMaintenanceDto {
  @IsDateString()
  startAt!: string;

  @IsDateString()
  endAt!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
