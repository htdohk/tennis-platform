import { IsString, IsPhoneNumber } from 'class-validator';

export class LoginDto {
  @IsPhoneNumber('CN')
  phone!: string;

  @IsString()
  password!: string;
}
