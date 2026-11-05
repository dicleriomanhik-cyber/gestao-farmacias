import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';

@Injectable()
export class AccountService {
  constructor(private readonly prisma: PrismaService) {}

  async deleteAccount(user: AuthenticatedUser, password: string) {
    if (!user.roles.includes('ADMIN')) throw new ForbiddenException('Só o administrador pode eliminar a conta.');
    const me = await this.prisma.user.findUnique({ where: { id: user.id } });
    if (!me) throw new NotFoundException('Utilizador não encontrado.');
    const ok = await bcrypt.compare(password, me.passwordHash);
    if (!ok) throw new BadRequestException('Palavra-passe incorreta.');
    const p = me.pharmacyId;

    await this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`delete from "quarantine_stock" where "pharmacyId" = ${p}::uuid`;
        await tx.$executeRaw`delete from "sale_returns" where "pharmacyId" = ${p}::uuid`;
        await tx.$executeRaw`delete from "sale_payments" where "saleId" in (select id from "sales" where "pharmacyId" = ${p}::uuid)`;
        await tx.$executeRaw`delete from "sales" where "pharmacyId" = ${p}::uuid`;
        await tx.$executeRaw`delete from "cash_movements" where "cashSessionId" in (select id from "cash_sessions" where "pharmacyId" = ${p}::uuid)`;
        await tx.$executeRaw`delete from "expenses" where "pharmacyId" = ${p}::uuid`;
        await tx.$executeRaw`delete from "supplier_payments" where "pharmacyId" = ${p}::uuid`;
        await tx.$executeRaw`delete from "inventory_counts" where "pharmacyId" = ${p}::uuid`;
        await tx.$executeRaw`delete from "stock_movements" where "pharmacyId" = ${p}::uuid`;
        await tx.$executeRaw`delete from "stock_lots" where "pharmacyId" = ${p}::uuid`;
        await tx.$executeRaw`delete from "purchases" where "pharmacyId" = ${p}::uuid`;
        await tx.$executeRaw`delete from "cash_sessions" where "pharmacyId" = ${p}::uuid`;
        await tx.$executeRaw`delete from "products" where "pharmacyId" = ${p}::uuid`;
        await tx.$executeRaw`delete from "suppliers" where "pharmacyId" = ${p}::uuid`;
        await tx.$executeRaw`delete from "pharmacy_operators" where "pharmacyId" = ${p}::uuid`;
        await tx.$executeRaw`delete from "audit_logs" where "pharmacyId" = ${p}::uuid`;
        await tx.$executeRaw`delete from "login_attempts" where "userId" in (select id from "users" where "pharmacyId" = ${p}::uuid) or "email" in (select email from "users" where "pharmacyId" = ${p}::uuid)`;
        await tx.$executeRaw`delete from "users" where "pharmacyId" = ${p}::uuid`;
        await tx.$executeRaw`delete from "pharmacies" where "id" = ${p}::uuid`;
      },
      { timeout: 120000, maxWait: 10000 },
    );

    return { deleted: true };
  }
}