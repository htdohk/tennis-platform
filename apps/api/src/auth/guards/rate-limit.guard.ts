import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private readonly redis: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const httpCtx = context.switchToHttp();
    const request = httpCtx.getRequest<{ body?: { phone?: string } }>();
    const phone = request.body?.phone;
    if (!phone) return true;

    const key = `login_attempts:${phone}`;
    const attempts = await this.redis.client.get(key);
    const count = attempts ? parseInt(attempts, 10) : 0;

    if (count >= 5) {
      const ttl = await this.redis.client.ttl(key);
      const minutes = ttl > 0 ? Math.ceil(ttl / 60) : 5;
      throw new HttpException(
        `登录尝试次数过多，请 ${minutes} 分钟后再试`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
