// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

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
    const where = {
      pharmacyId,
      ...(search && { 
        OR: [
          { fullName: { contains: search, mode: 'insensitive' as const } }, 
          { email: { contains: search, mode: 'insensitive' as const } }
        ] 
      }),
    };
    
    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({ 
        where, skip, take, 
        select: { id: true, email: true, fullName: true, status: true, createdAt: true, updatedAt: true, roles: { include: { role: true } } }
      }),
      this.prisma.user.count({ where }),
    ]);
    
    return { data, total };
  }

  async findOne(pharmacyId: string, id: string) {
    return this.prisma.user.findFirst({
      where: { id, pharmacyId },
      select: { id: true, email: true, fullName: true, status: true, createdAt: true, updatedAt: true, roles: { include: { role: true } } }
    });
  }

  async countActiveAdmins(pharmacyId: string) {
    return this.prisma.user.count({
      where: { pharmacyId, status: 'ACTIVE', roles: { some: { role: { name: 'ADMIN' } } } },
    });
  }

  // NOVO MÉTODO: Bloqueio de linha para evitar Race Condition
  async countActiveAdminsForUpdate(tx: any, pharmacyId: string) {
    const result = await tx.$queryRaw`
      SELECT COUNT(*)::int FROM "user_roles" ur
      JOIN "users" u ON u.id = ur."userId"
      JOIN "roles" r ON r.id = ur."roleId"
      WHERE u."pharmacyId" = ${pharmacyId} AND u.status = 'ACTIVE' AND r.name = 'ADMIN'
      FOR UPDATE OF u
    `;
    return result[0].count;
  }
}