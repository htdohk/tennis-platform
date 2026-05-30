import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { ConfigService } from '../config/config.service';

@Injectable()
export class InternalAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const token = request.headers['x-internal-token'] as string | undefined;
    const expected = this.config.get('MCP_INTERNAL_TOKEN');

    if (!token || token !== expected) {
      throw new UnauthorizedException('Invalid or missing X-Internal-Token');
    }

    return true;
  }
}
