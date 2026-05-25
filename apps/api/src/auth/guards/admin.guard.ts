import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class AdminGuard extends AuthGuard('jwt') {
  handleRequest<TUser = { id: string; phone: string; role: string }>(
    err: any,
    user: TUser | null,
  ): TUser {
    if (err || !user) {
      throw new UnauthorizedException('Unauthorized');
    }
    const u = user as unknown as { role: string };
    if (u.role !== 'BOSS' && u.role !== 'STAFF') {
      throw new UnauthorizedException('Forbidden: admin role required');
    }
    return user;
  }

  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
}
