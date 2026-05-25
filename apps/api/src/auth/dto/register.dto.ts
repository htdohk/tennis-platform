import {
  IsString,
  IsPhoneNumber,
  IsOptional,
  IsEnum,
  IsNumber,
  MinLength,
  Validate,
} from 'class-validator';
import { Gender } from '@prisma/client';
import { IsValidTennisLevel } from '../../common/validators/tennis-level.validator';

export class RegisterDto {
  @IsPhoneNumber('CN')
  phone!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  @MinLength(1)
  nickname!: string;

  @IsNumber()
  @Validate(IsValidTennisLevel)
  level!: number;

  @IsString()
  @MinLength(1, { message: '微信号不能为空' })
  wechatId!: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;
}
