import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { emitOutboxEvent } from '../sync/outbox.helper';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async resetTestData(user: { id: string; pharmacyId: string }, password: string) {
    const me = await this.prisma.user.findUnique({ where: { id: user.id } });
    if (!me || me.pharmacyId !== user.pharmacyId) throw new NotFoundException('Utilizador não encontrado.');
    const ok = await bcrypt.compare(password, me.passwordHash);
    if (!ok) throw new BadRequestException('Palavra-passe incorreta.');
    const p = user.pharmacyId;

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
        await tx.auditLog.create({ data: { pharmacyId: p, userId: me.id, action: 'pharmacy.data.reset', entity: 'Pharmacy', entityId: p } });
        await emitOutboxEvent(tx, p, 'PHARMACY_RESET', p, 'UPDATED', { reset: true });
      },
      { timeout: 120000, maxWait: 10000 },
    );

    return { message: 'Dados da farmácia reiniciados com sucesso.' };
  }
}