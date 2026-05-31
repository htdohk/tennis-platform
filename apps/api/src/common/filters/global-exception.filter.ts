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
    const request = ctx.getRequest<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    const code = -1;
    let message = 'Internal server error';
    const isDev = process.env.NODE_ENV !== 'production';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (typeof body === 'object' && body !== null) {
        const b = body as Record<string, unknown>;
        message = (b.message as string) || exception.message;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    this.logger.error(
      `${request.method} ${request.url} → ${status} ${message}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    const errorName =
      exception instanceof HttpException
        ? exception.name
        : 'InternalServerError';

    response.status(status).json({
      code,
      message,
      details: {
        message: exception instanceof Error ? exception.message : 'Unknown error',
        error: errorName,
        statusCode: status,
        ...(isDev && exception instanceof Error ? { stack: exception.stack } : {}),
      },
    });
  }
}
