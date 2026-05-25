import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local') {
  constructor(private readonly authService: AuthService) {
    super({ usernameField: 'phone' });
  }

  async validate(phone: string, password: string) {
    const user = await this.authService.validateUser(phone, password);
    if (!user) {
      throw new UnauthorizedException('手机号或密码错误');
    }
    return user;
  }
}
