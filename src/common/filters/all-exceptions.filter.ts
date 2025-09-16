import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ErrorCode } from '../errors/error-codes';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request & { requestId?: string }>();

    const isProd = process.env.NODE_ENV === 'production';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = ErrorCode.INTERNAL_SERVER_ERROR;
    let message = this.publicMessage(HttpStatus.INTERNAL_SERVER_ERROR);
    let detail: any = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const resp: any = exception.getResponse();

      code = (resp && resp.code) || this.mapHttpStatusToCode(status);

      const rawMessage = resp?.message || exception.message;
      message = isProd
        ? this.publicMessage(status)
        : rawMessage || this.publicMessage(status);

      // 개발 일때만 자세한 로그 출력
      detail = !isProd
        ? (resp?.detail ?? this.extractDetail(exception))
        : undefined;
    } else if (this.isPrismaKnownError(exception)) {
      const e = exception as Prisma.PrismaClientKnownRequestError;
      const mapped = this.mapPrismaError(e);
      status = mapped.status;
      code = mapped.code;

      message = isProd ? this.publicMessage(status) : mapped.message;
      detail = !isProd
        ? { meta: e.meta, target: (e as any).meta?.target, code: e.code }
        : undefined;
    } else if (exception instanceof Error) {
      message = isProd
        ? this.publicMessage(status)
        : exception.message || this.publicMessage(status);
      detail = !isProd ? { stack: exception.stack } : undefined;
    }

    this.logger.error(
      `[${code}] ${message}`,
      exception instanceof Error ? exception.stack : JSON.stringify(exception),
    );

    const payload = {
      success: false,
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
      status, // 뺄까 말까...?
      code,
      message,
      ...(detail ? { detail } : {}),
      ...(req.requestId ? { requestId: req.requestId } : {}),
    };

    res.status(status).json(payload);
  }

  private extractDetail(ex: unknown) {
    if (ex instanceof HttpException) return ex.getResponse();
    if (ex instanceof Error) return { stack: ex.stack };
    return ex;
  }

  private isPrismaKnownError(
    ex: unknown,
  ): ex is Prisma.PrismaClientKnownRequestError {
    return (
      typeof ex === 'object' && ex !== null && (ex as any).code?.startsWith('P')
    );
  }

  private mapPrismaError(e: Prisma.PrismaClientKnownRequestError) {
    switch (e.code) {
      case 'P2002':
        return {
          status: HttpStatus.CONFLICT,
          code: ErrorCode.DB_UNIQUE_CONSTRAINT,
          message: '이미 존재하는 값입니다.',
        };
      case 'P2003':
        return {
          status: HttpStatus.BAD_REQUEST,
          code: ErrorCode.DB_FOREIGN_KEY,
          message: '연관된 데이터 제약 조건에 위배됩니다.',
        };
      case 'P2025':
        return {
          status: HttpStatus.NOT_FOUND,
          code: ErrorCode.DB_NOT_FOUND,
          message: '대상을 찾을 수 없습니다.',
        };
      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          message: 'DB 처리 중 오류가 발생했습니다.',
        };
    }
  }

  private mapHttpStatusToCode(status: number): ErrorCode {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return ErrorCode.BAD_REQUEST;
      case HttpStatus.UNAUTHORIZED:
        return ErrorCode.UNAUTHORIZED;
      case HttpStatus.FORBIDDEN:
        return ErrorCode.FORBIDDEN;
      case HttpStatus.NOT_FOUND:
        return ErrorCode.NOT_FOUND;
      case HttpStatus.CONFLICT:
        return ErrorCode.CONFLICT;
      case HttpStatus.UNSUPPORTED_MEDIA_TYPE:
        return ErrorCode.UNSUPPORTED_MEDIA_TYPE;
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return ErrorCode.UNPROCESSABLE_ENTITY;
      case HttpStatus.TOO_MANY_REQUESTS:
        return ErrorCode.TOO_MANY_REQUESTS;
      case HttpStatus.SERVICE_UNAVAILABLE:
        return ErrorCode.SERVICE_UNAVAILABLE;
      default:
        return ErrorCode.INTERNAL_SERVER_ERROR;
    }
  }

  private publicMessage(status: number) {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return '요청이 올바르지 않습니다.';
      case HttpStatus.UNAUTHORIZED:
        return '인증이 필요합니다.';
      case HttpStatus.FORBIDDEN:
        return '접근이 거부되었습니다.';
      case HttpStatus.NOT_FOUND:
        return '리소스를 찾을 수 없습니다.';
      case HttpStatus.CONFLICT:
        return '요청이 처리되지 않았습니다.';
      case HttpStatus.UNSUPPORTED_MEDIA_TYPE:
        return '지원하지 않는 요청 형식입니다.';
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return '요청 데이터가 유효하지 않습니다.';
      case HttpStatus.TOO_MANY_REQUESTS:
        return '요청이 너무 많습니다. 잠시 후 다시 시도하세요.';
      case HttpStatus.SERVICE_UNAVAILABLE:
        return '일시적으로 사용할 수 없습니다. 잠시 후 다시 시도하세요.';
      default:
        return '서버 오류가 발생했습니다. 잠시 후 다시 시도하세요.';
    }
  }
}
