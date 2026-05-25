import { IsString, MinLength, IsOptional } from 'class-validator';

export class CreateVenueDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @MinLength(1)
  address!: string;

  @IsOptional()
  @IsString()
  intro?: string;

  @IsOptional()
  contact?: string;
}
