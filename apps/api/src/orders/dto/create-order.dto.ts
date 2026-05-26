import { IsString, IsDateString, IsOptional } from 'class-validator';

export class CreateOrderDto {
  @IsString()
  courtId!: string;

  @IsDateString()
  startAt!: string;

  @IsDateString()
  endAt!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
