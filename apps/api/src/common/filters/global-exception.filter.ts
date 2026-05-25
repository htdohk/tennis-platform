import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    const code = -1;
    let message = 'Internal server error';
    let details: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (typeof body === 'object' && body !== null) {
        const b = body as Record<string, unknown>;
        message = (b.message as string) || exception.message;
        details = b;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      details = exception.stack;
    }

    this.logger.error(
      `${request.method} ${request.url} → ${status} ${message}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(status).json({
      code,
      message,
      ...(details && process.env.NODE_ENV !== 'production' ? { details } : {}),
    });
  }
}
