import { IsString, IsDateString, IsOptional, IsIn } from 'class-validator';

export class CreateInternalOrderDto {
  @IsString()
  wechatId!: string;

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

export class CancelOrderRequestDto {
  @IsString()
  reason!: string;
}

export class QueryOrdersDto {
  @IsString()
  wechatId!: string;

  @IsOptional()
  @IsString()
  @IsIn([
    'PENDING_CONFIRM',
    'CONFIRMED',
    'COMPLETED',
    'CANCELLED',
    'RECRUITING',
    'RECRUITING_EXPIRED',
  ])
  status?: string;
}
