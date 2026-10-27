import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async resetTestData(pharmacyId: string) {
    await this.prisma.$transaction(async (tx) => {
      // 1. Cancelar todas as vendas
      await tx.sale.updateMany({
        where: { pharmacyId, status: { not: "CANCELLED" } },
        data: { status: "CANCELLED" },
      });

      // 2. Cancelar todas as despesas
      await tx.expense.updateMany({
        where: { pharmacyId, status: { not: "CANCELLED" } },
        data: { status: "CANCELLED" },
      });

      // 3. Cancelar todas as devoluções
      await tx.saleReturn.updateMany({
        where: { pharmacyId, status: { not: "CANCELLED" } },
        data: { status: "CANCELLED" },
      });

      // 4. Fechar todas as sessões de caixa abertas
      await tx.cashSession.updateMany({
        where: { pharmacyId, status: "OPEN" },
        data: {
          status: "CLOSED",
          countedBalance: 0,
          closedAt: new Date(),
        },
      });
    });

    return { message: "Dados de teste reiniciados com sucesso." };
  }
}
