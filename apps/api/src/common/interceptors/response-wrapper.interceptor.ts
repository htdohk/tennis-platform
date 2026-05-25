import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

interface WrappedResponse<T> {
  code: number;
  data: T;
  message: string;
}

@Injectable()
export class ResponseWrapperInterceptor<T> implements NestInterceptor<
  T,
  WrappedResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<WrappedResponse<T>> {
    return next.handle().pipe(
      map((data: T) => ({
        code: 0,
        data,
        message: 'ok',
      })),
    );
  }
}
