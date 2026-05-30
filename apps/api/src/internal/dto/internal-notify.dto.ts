import { IsString, IsOptional } from 'class-validator';

export class NotifyBossDto {
  @IsString()
  message!: string;

  @IsOptional()
  @IsString()
  orderId?: string;

  @IsOptional()
  @IsString()
  context?: string;
}
