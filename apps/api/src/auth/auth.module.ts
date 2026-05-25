import { Module } from '@nestjs/common';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '../config/config.service';
import { UsersModule } from '../users/users.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AdminAuthController } from './admin-auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { AdminGuard } from './guards/admin.guard';
import { RateLimitGuard } from './guards/rate-limit.guard';

@Module({
  imports: [
    PassportModule,
    UsersModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService): JwtModuleOptions => ({
        secret: config.jwtSecret,
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  controllers: [AuthController, AdminAuthController],
  providers: [
    AuthService,
    JwtStrategy,
    LocalStrategy,
    AdminGuard,
    RateLimitGuard,
  ],
  exports: [AuthService, JwtModule, AdminGuard, RateLimitGuard],
})
export class AuthModule {}
