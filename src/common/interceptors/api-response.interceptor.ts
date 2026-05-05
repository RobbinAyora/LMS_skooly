import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

@Injectable()
export class ApiResponseInterceptor<T> implements NestInterceptor<T> {
  private readonly logger = new Logger(ApiResponseInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<T> {
    const now = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - now;
        this.logger.log(`Request completed in ${duration}ms`);
      }),
      catchError((error) => {
        this.logger.error('Request failed:', error.message);

        // Let Nest's built-in exception handler handle the response
        // We just log here
        return throwError(() => error);
      }),
    );
  }
}

// Helper function to create consistent API responses
export function apiSuccess<T>(data: T, message?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    ...(message && { message }),
  };
}

export function apiError(message: string, error?: any): ApiResponse<never> {
  return {
    success: false,
    message,
    error: error?.message || error,
  };
}
