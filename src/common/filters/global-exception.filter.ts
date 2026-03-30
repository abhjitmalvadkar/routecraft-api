import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { QueryFailedError, EntityNotFoundError } from 'typeorm';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'Internal server error';
    let details: any = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const res = exceptionResponse as any;
        message = res.message || exception.message;
        details = res.message !== message ? res.message : undefined;
      }
      code = `HTTP_${status}`;
    } else if (exception instanceof QueryFailedError) {
      const err = exception as any;
      if (err.code === '23505') {
        // Unique constraint violation
        status = HttpStatus.CONFLICT;
        code = 'DUPLICATE_ENTRY';
        message = 'Resource already exists';
        details = err.detail;
      } else {
        status = HttpStatus.BAD_REQUEST;
        code = 'DATABASE_ERROR';
        message = 'Database query failed';
      }
    } else if (exception instanceof EntityNotFoundError) {
      status = HttpStatus.NOT_FOUND;
      code = 'NOT_FOUND';
      message = 'Resource not found';
    }

    this.logger.error(
      `${code}: ${message}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(status).json({
      success: false,
      data: null,
      error: {
        code,
        details: process.env.NODE_ENV === 'development' ? details : undefined,
      },
      message: Array.isArray(message) ? message[0] : message,
    });
  }
}
