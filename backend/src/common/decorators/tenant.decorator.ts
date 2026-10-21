import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

/**
 * Devolve o pharmacyId a partir do contexto autenticado (JWT verificado + BD).
 * NUNCA lê o pharmacyId do body/query/header do pedido.
 */
export const Tenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const req = ctx.switchToHttp().getRequest();
    const user: AuthenticatedUser | undefined = req.user;
    return user?.pharmacyId;
  },
);
