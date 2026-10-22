import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByEmailWithAuth(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        pharmacy: true,
        roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
      },
    });
  }

  findByIdWithAuth(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        pharmacy: true,
        roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
      },
    });
  }

  updateLastLogin(id: string) {
    return this.prisma.user.update({ 
      where: { id }, 
      data: { lastLoginAt: new Date() } 
    });
  }

  async findAll(pharmacyId: string, skip: number, take: number, search?: string) {
    const where: Prisma.UserWhereInput = {
      pharmacyId,
      ...(search && { 
        OR: [
          { fullName: { contains: search, mode: 'insensitive' } }, 
          { email: { contains: search, mode: 'insensitive' } }
        ] 
      }),
    };
    
    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({ 
        where, 
        skip, 
        take, 
        select: {
          id: true,
          email: true,
          fullName: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          roles: { include: { role: true } }
        }
      }),
      this.prisma.user.count({ where }),
    ]);
    
    return { data, total };
  }

  async findOne(pharmacyId: string, id: string) {
    return this.prisma.user.findFirst({
      where: { id, pharmacyId },
      select: {
        id: true,
        email: true,
        fullName: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        roles: { include: { role: true } }
      }
    });
  }

  async countActiveAdmins(pharmacyId: string) {
    return this.prisma.user.count({
      where: { 
        pharmacyId, 
        status: 'ACTIVE', 
        roles: { some: { role: { name: 'ADMIN' } } } 
      },
    });
  }

  async countActiveAdminsForUpdate(tx: Prisma.TransactionClient, pharmacyId: string) {
    // O PostgreSQL não permite FOR UPDATE directamente com funções agregadas.
    // Bloqueamos as linhas de `users` dos admins activos numa subquery com
    // FOR UPDATE, e contamos as linhas fora da subquery. O bloqueio é
    // adquirido na subquery e mantido até ao fim da transacção.
    const result = await tx.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::int FROM (
        SELECT u.id
        FROM "user_roles" ur
        JOIN "users" u ON u.id = ur."userId"
        JOIN "roles" r ON r.id = ur."roleId"
        WHERE u."pharmacyId" = ${pharmacyId}::uuid
          AND u.status = 'ACTIVE'
          AND r.name = 'ADMIN'
        FOR UPDATE OF u
      ) sub
    `;
    return result[0]?.count ? Number(result[0].count) : 0;
  }
}