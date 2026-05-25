import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RateLimitGuard } from './guards/rate-limit.guard';

@Controller('admin/auth')
export class AdminAuthController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {}

  @UseGuards(RateLimitGuard)
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() dto: LoginDto) {
    const user = await this.authService.validateUser(dto.phone, dto.password);
    if (!user) {
      await this.usersService.recordLoginFailure(dto.phone);
      throw new UnauthorizedException('手机号或密码错误');
    }
    if (user.role !== 'BOSS' && user.role !== 'STAFF') {
      throw new UnauthorizedException('无权访问管理后台');
    }
    await this.usersService.resetLoginAttempts(dto.phone);
    return this.authService.login(user);
  }
}
