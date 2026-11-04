import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { UsersService } from './users.service';
import { OperatorsService } from '../operators/operators.service';
import { CreatePharmacyAccountDto, UpdatePharmacyAccountDto } from './dto/pharmacy-account.dto';
import { CreateOperatorDto } from '../operators/dto/create-operator.dto';
import { UpdateOperatorDto } from '../operators/dto/update-operator.dto';

@Injectable()
export class PharmacyAccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly operators: OperatorsService,
  ) {}

  private async owned(ownerId: string, id: string) {
    const p = await this.prisma.pharmacy.findFirst({ where: { id, ownerPharmacyId: ownerId } });
    if (!p) throw new NotFoundException('Farmácia não encontrada.');
    return p;
  }

  private async build(pharmacies: { id: string; name: string; tradeName: string | null; createdAt: Date }[]) {
    const ids = pharmacies.map((p) => p.id);
    if (ids.length === 0) return [];
    const users = await this.prisma.user.findMany({
      where: { pharmacyId: { in: ids } },
      orderBy: { createdAt: 'asc' },
      select: { id: true, email: true, status: true, pharmacyId: true },
    });
    const ops = await this.prisma.pharmacyOperator.findMany({
      where: { pharmacyId: { in: ids } },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      select: { id: true, name: true, isActive: true, pharmacyId: true },
    });
    return pharmacies.map((p) => {
      const u = users.find((x) => x.pharmacyId === p.id);
      return {
        id: p.id,
        name: p.tradeName || p.name,
        createdAt: p.createdAt,
        userId: u?.id ?? null,
        email: u?.email ?? null,
        status: u?.status ?? 'INACTIVE',
        operators: ops.filter((o) => o.pharmacyId === p.id).map((o) => ({ id: o.id, name: o.name, isActive: o.isActive })),
      };
    });
  }

  async list(ownerId: string) {
    const rows = await this.prisma.pharmacy.findMany({
      where: { ownerPharmacyId: ownerId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, tradeName: true, createdAt: true },
    });
    return this.build(rows);
  }

  async get(ownerId: string, id: string) {
    const p = await this.owned(ownerId, id);
    const [row] = await this.build([p]);
    return row;
  }

  async create(ownerId: string, actorId: string, dto: CreatePharmacyAccountDto) {
    const name = dto.pharmacyName.trim();
    if (name.length < 2) throw new BadRequestException('Indica o nome da farmácia.');
    const email = dto.email.trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Email já registado.');
    const names: string[] = [];
    for (const raw of dto.operatorNames) {
      const n = raw.trim();
      if (n.length < 2) continue;
      if (!names.some((x) => x.toLowerCase() === n.toLowerCase())) names.push(n);
    }
    if (names.length === 0) throw new BadRequestException('Indica pelo menos um colaborador.');
    const passwordHash = await this.users.hashPassword(dto.password);
    const id = await this.prisma.$transaction(async (tx) => {
      const role = await tx.role.findUnique({ where: { name: 'COLLABORATOR' } });
      if (!role) throw new BadRequestException('Função inválida.');
      const pharmacy = await tx.pharmacy.create({
        data: { name, tradeName: name, status: 'ACTIVE', ownerPharmacyId: ownerId },
      });
      const user = await tx.user.create({
        data: { pharmacyId: pharmacy.id, email, passwordHash, fullName: name, status: UserStatus.ACTIVE },
      });
      await tx.userRole.create({ data: { userId: user.id, roleId: role.id } });
      await tx.pharmacyOperator.createMany({ data: names.map((n) => ({ pharmacyId: pharmacy.id, name: n })) });
      await tx.auditLog.create({
        data: { pharmacyId: ownerId, userId: actorId, action: 'pharmacy_account.create', entity: 'Pharmacy', entityId: pharmacy.id },
      });
      return pharmacy.id;
    });
    return this.get(ownerId, id);
  }

  async update(ownerId: string, actorId: string, id: string, dto: UpdatePharmacyAccountDto) {
    await this.owned(ownerId, id);
    const user = await this.prisma.user.findFirst({ where: { pharmacyId: id }, orderBy: { createdAt: 'asc' } });
    if (!user) throw new NotFoundException('Conta de acesso não encontrada.');
    const userData: { passwordHash?: string; status?: UserStatus } = {};
    if (dto.password) userData.passwordHash = await this.users.hashPassword(dto.password);
    if (dto.status) userData.status = dto.status === 'ACTIVE' ? UserStatus.ACTIVE : UserStatus.INACTIVE;
    await this.prisma.$transaction(async (tx) => {
      if (dto.pharmacyName !== undefined) {
        const n = dto.pharmacyName.trim();
        if (n.length < 2) throw new BadRequestException('O nome da farmácia deve ter pelo menos 2 caracteres.');
        await tx.pharmacy.update({ where: { id }, data: { name: n, tradeName: n } });
      }
      if (Object.keys(userData).length > 0) await tx.user.update({ where: { id: user.id }, data: userData });
      await tx.auditLog.create({
        data: { pharmacyId: ownerId, userId: actorId, action: 'pharmacy_account.update', entity: 'Pharmacy', entityId: id },
      });
    });
    return this.get(ownerId, id);
  }

  async addOperator(ownerId: string, actorId: string, id: string, dto: CreateOperatorDto) {
    await this.owned(ownerId, id);
    return this.operators.create(id, actorId, dto);
  }

  async updateOperator(ownerId: string, actorId: string, id: string, opId: string, dto: UpdateOperatorDto) {
    await this.owned(ownerId, id);
    return this.operators.update(id, actorId, opId, dto);
  }
}