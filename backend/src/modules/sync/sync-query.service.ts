// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class SyncQueryService {
  constructor(private prisma: PrismaService) {}

  async listOperations(pharmacyId: string, status?: string, limit = 50) {
    const where: any = { pharmacyId };
    if (status) where.status = status;

    const items = await this.prisma.syncOperation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 200),
      select: {
        idempotencyKey: true,
        clientId: true,
        operationType: true,
        status: true,
        saleId: true,
        result: true,
        rejectionCode: true,
        rejectionReason: true,
        createdAt: true,
        processedAt: true,
      },
    });

    const counts = await this.prisma.syncOperation.groupBy({
      by: ['status'],
      where: { pharmacyId },
      _count: { _all: true },
    });

    // Enriquece as faltas com o nome do produto, para o painel administrativo
    const productIds = new Set<string>();
    for (const it of items as any[]) {
      for (const s of it.result?.shortages ?? []) productIds.add(s.productId);
    }
    const produtos = productIds.size
      ? await this.prisma.product.findMany({
          where: { id: { in: [...productIds] }, pharmacyId },
          select: { id: true, name: true },
        })
      : [];
    const nomes = new Map(produtos.map((p) => [p.id, p.name]));
    for (const it of items as any[]) {
      if (it.result?.shortages) {
        it.result.shortages = it.result.shortages.map((s) => ({ ...s, productName: nomes.get(s.productId) ?? null }));
      }
    }

    return {
      items,
      counts: counts.map((c) => ({ status: c.status, total: c._count._all })),
    };
  }
}