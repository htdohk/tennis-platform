import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  MinLength,
  Validate,
} from 'class-validator';
import { UserStatus } from '@prisma/client';
import { IsValidTennisLevel } from '../../common/validators/tennis-level.validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  nickname?: string;

  @IsOptional()
  @IsNumber()
  @Validate(IsValidTennisLevel)
  level?: number;

  @IsOptional()
  @IsString()
  wechatId?: string;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}
