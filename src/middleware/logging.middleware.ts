import {
  Injectable,
  NestMiddleware,
  BadRequestException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const now = new Date();
    const { method, url } = req;

    res.on('finish', () => {
      const duration = Date.now() - now.getTime();
      console.log(
        `[${now.toISOString()}] ${method} ${url} -> ${res.statusCode} (${duration}ms)`,
      );
    });

    // Log route params for courses endpoints
    if (url.startsWith('/courses/')) {
      console.log(
        `[DEBUG] Course request - URL: ${url}, Method: ${method}, Params: ${JSON.stringify(req.params)}`,
      );
    }

    next();
  }
}
