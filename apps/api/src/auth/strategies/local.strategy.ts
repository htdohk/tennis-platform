import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';
import { UsersService } from '../../users/users.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local') {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {
    super({ usernameField: 'phone' });
  }

  async validate(phone: string, password: string) {
    const user = await this.authService.validateUser(phone, password);
    if (!user) {
      await this.usersService.recordLoginFailure(phone);
      throw new UnauthorizedException('手机号或密码错误');
    }
    return user;
  }
}
