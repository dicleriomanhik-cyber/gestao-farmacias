import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

interface AuditedRoute {
  method: string;
  pathFragment: string;
  action: string;
  entity: string;
}

/** Rotas-alvo de auditoria automática nesta fase. Alargar com aprovação. */
const AUDITED: AuditedRoute[] = [
  { method: 'POST', pathFragment: '/auth/login', action: 'auth.login', entity: 'User' },
  { method: 'POST', pathFragment: '/auth/logout', action: 'auth.logout', entity: 'User' },
  { method: 'POST', pathFragment: '/auth/refresh', action: 'auth.refresh', entity: 'User' },
];

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();
    const method: string = req.method;
    const path: string = req.route?.path ?? req.path ?? '';
    const match = AUDITED.find((r) => r.method === method && path.includes(r.pathFragment));
    if (!match) return next.handle();

    return next.handle().pipe(
      tap(() => {
        // Auditoria só após sucesso; falhas são registadas pelos próprios serviços.
        const user: AuthenticatedUser | undefined = req.user;
        void this.prisma.auditLog
          .create({
            data: {
              pharmacyId: user?.pharmacyId ?? null,
              userId: user?.id ?? null,
              action: match.action,
              entity: match.entity,
              entityId: user?.id ?? null,
              ipAddress: (req.ip ?? '').toString() || null,
              userAgent: (req.headers['user-agent'] ?? '').toString() || null,
              metadata: { status: res.statusCode, path },
            },
          })
          .catch(() => {
            /* nunca deixar falha de auditoria derrubar o pedido, mas o erro real deve ser monitorizado */
          });
      }),
    );
  }
}
