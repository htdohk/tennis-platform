import { IsString, IsEnum, Matches, IsDecimal } from 'class-validator';
import { DateType, TimeSlotType } from '@prisma/client';

export class CreatePriceRuleDto {
  @IsString()
  venueId!: string;

  @IsEnum(DateType)
  dateType!: DateType;

  @IsEnum(TimeSlotType)
  timeSlotType!: TimeSlotType;

  @Matches(/^\d{2}:\d{2}$/, { message: 'timeStart 格式必须为 HH:mm' })
  timeStart!: string;

  @Matches(/^\d{2}:\d{2}$/, { message: 'timeEnd 格式必须为 HH:mm' })
  timeEnd!: string;

  @IsDecimal({ decimal_digits: '1,2' })
  pricePer30min!: string;
}
