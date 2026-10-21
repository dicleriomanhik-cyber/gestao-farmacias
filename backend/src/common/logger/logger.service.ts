import { Injectable } from '@nestjs/common';
import { Logger } from '@nestjs/common';

/**
 * Logger técnico. Nunca deve receber segredos, passwords ou tokens.
 * Filtra campos sensíveis defensivamente.
 */
@Injectable()
export class AppLogger {
  private readonly logger = new Logger('App');

  private sanitize(obj: unknown): unknown {
    if (!obj || typeof obj !== 'object') return obj;
    const clone: Record<string, unknown> = Array.isArray(obj)
      ? ([...obj] as unknown as Record<string, unknown>)
      : { ...(obj as Record<string, unknown>) };
    const sensitive = ['password', 'passwordHash', 'token', 'accessToken', 'refreshToken', 'authorization'];
    for (const key of Object.keys(clone)) {
      if (sensitive.some((s) => key.toLowerCase().includes(s.toLowerCase()))) {
        clone[key] = '[REDACTED]';
      }
    }
    return clone;
  }

  log(message: unknown, ...optionalParams: unknown[]): void {
    this.logger.log(this.sanitize(message), ...optionalParams.map((p) => this.sanitize(p)));
  }
  error(message: unknown, ...optionalParams: unknown[]): void {
    this.logger.error(this.sanitize(message), ...optionalParams.map((p) => this.sanitize(p)));
  }
  warn(message: unknown, ...optionalParams: unknown[]): void {
    this.logger.warn(this.sanitize(message), ...optionalParams.map((p) => this.sanitize(p)));
  }
  debug(message: unknown, ...optionalParams: unknown[]): void {
    this.logger.debug(this.sanitize(message), ...optionalParams.map((p) => this.sanitize(p)));
  }
  verbose(message: unknown, ...optionalParams: unknown[]): void {
    this.logger.verbose(this.sanitize(message), ...optionalParams.map((p) => this.sanitize(p)));
  }
}