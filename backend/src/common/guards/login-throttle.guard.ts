import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';

/**
 * Limite por (email + IP) e por IP isoladamente, com janela configurável.
 * Verifica BD antes de permitir o pedido. Não substitui rate-limit de borda,
 * mas protege a aplicação mesmo sem proxy.
 */
@Injectable()
export class LoginThrottleGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const email: string | undefined = req.body?.email;
    const ip: string = (req.ip ?? req.socket?.remoteAddress ?? 'unknown').toString();
    if (!email) return true;

    const windowMinutes = this.config.get<number>('loginThrottle.windowMinutes') ?? 15;
    const maxAttempts = this.config.get<number>('loginThrottle.maxAttempts') ?? 10;
    const since = new Date(Date.now() - windowMinutes * 60_000);

    const [byEmailIp, byIp] = await Promise.all([
      this.prisma.loginAttempt.count({
        where: { email, ipAddress: ip, success: false, createdAt: { gte: since } },
      }),
      this.prisma.loginAttempt.count({
        where: { ipAddress: ip, success: false, createdAt: { gte: since } },
      }),
    ]);

    if (byEmailIp >= maxAttempts || byIp >= maxAttempts * 3) {
      throw new HttpException(
        { message: 'Demasiadas tentativas de autenticação. Tente mais tarde.', code: 'RATE_LIMITED' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }
}
