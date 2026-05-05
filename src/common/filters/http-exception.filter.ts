import {
  Catch,
  ExceptionFilter,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

export interface ErrorResponse {
  success: false;
  message: string;
  error?: string;
  statusCode: number;
}

@Catch()
@Injectable()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    const errorResponse: ErrorResponse = {
      success: false,
      message: typeof message === 'string' ? message : 'Error',
      statusCode,
    };

    this.logger.error(
      `[${request.method}] ${request.url} - Status: ${statusCode}`,
      exception instanceof Error ? exception.message : String(exception),
    );

    response.status(statusCode).json({
      ...errorResponse,
      ...(statusCode === HttpStatus.INTERNAL_SERVER_ERROR && {
        error: 'Internal server error',
      }),
    });
  }
}
