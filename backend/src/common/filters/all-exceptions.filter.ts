import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { AppLogger } from '../logger/logger.service';

export interface ApiErrorBody {
  success: false;
  error: {
    statusCode: number;
    code: string;
    message: string | string[];
    path: string;
    timestamp: string;
  };
}

const FALLBACK: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'UNPROCESSABLE_ENTITY',
  429: 'TOO_MANY_REQUESTS',
  500: 'INTERNAL_SERVER_ERROR',
  503: 'SERVICE_UNAVAILABLE',
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: AppLogger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Erro interno do servidor.';
    let code = 'INTERNAL_SERVER_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const payload = exception.getResponse();

      if (typeof payload === 'string') {
        message = payload;
      } else if (payload && typeof payload === 'object') {
        const p = payload as Record<string, unknown>;
        if (typeof p.message !== 'undefined') {
          message = p.message as string | string[];
        }
        // Se o erro lançado pelo NestJS já trouxer um "code" (ex: INVALID_CREDENTIALS), usamos esse.
        if (typeof p.code === 'string' && p.code.length > 0) {
          code = p.code;
        }
      }

      // Se não foi definido um "code" específico, usamos o FALLBACK baseado no status HTTP.
      // Isto garante que uma rota não encontrada devolve "NOT_FOUND" e não "INTERNAL_SERVER_ERROR".
      if (code === 'INTERNAL_SERVER_ERROR' || !code) {
        code = FALLBACK[status] ?? 'ERROR';
      }
    } else {
      this.logger.error(
        `Unhandled exception on ${req.method} ${req.originalUrl}: ${(exception as Error)?.message ?? exception}`,
        (exception as Error)?.stack,
      );
    }

    const body: ApiErrorBody = {
      success: false,
      error: {
        statusCode: status,
        code,
        message,
        path: req.originalUrl,
        timestamp: new Date().toISOString(),
      },
    };

    res.status(status).json(body);
  }
}