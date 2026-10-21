// @ts-nocheck
import { BadRequestException, ForbiddenException, Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { UsersRepository } from './users.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly repo: UsersRepository,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.config.get<number>('bcryptSaltRounds') ?? 12);
  }

  async validateCredentials(email: string, password: string): Promise<any> {
    const record = await this.repo.findByEmailWithAuth(email);
    if (!record) throw new ForbiddenException({ message: 'Credenciais inválidas.', code: 'INVALID_CREDENTIALS' });
    if (record.pharmacy?.status !== 'ACTIVE' || record.status !== 'ACTIVE') {
      throw new ForbiddenException({ message: 'Conta inativa ou suspensa.', code: 'ACCOUNT_DISABLED' });
    }
    if (!(await bcrypt.compare(password, record.passwordHash))) {
      throw new ForbiddenException({ message: 'Credenciais inválidas.', code: 'INVALID_CREDENTIALS' });
    }

    const roles = record.roles.map((ur: any) => ur.role.name);
    const permissions = Array.from(new Set(record.roles.flatMap((ur: any) => ur.role.permissions.map((rp: any) => rp.permission.code))));

    await this.repo.updateLastLogin(record.id);
    return { id: record.id, email: record.email, pharmacyId: record.pharmacyId, roles, permissions };
  }

  async findAuthenticatedUser(id: string): Promise<any | null> {
    const record = await this.repo.findByIdWithAuth(id);
    if (!record || record.status !== 'ACTIVE' || record.pharmacy?.status !== 'ACTIVE') return null;
    const roles = record.roles.map((ur: any) => ur.role.name);
    const permissions = Array.from(new Set(record.roles.flatMap((ur: any) => ur.role.permissions.map((rp: any) => rp.permission.code))));
    return { id: record.id, email: record.email, pharmacyId: record.pharmacyId, roles, permissions };
  }

  async findAll(pharmacyId: string, page: number, limit: number, search?: string) {
    const skip = (page - 1) * limit;
    const { data, total } = await this.repo.findAll(pharmacyId, skip, limit, search);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(pharmacyId: string, id: string) {
    const user = await this.repo.findOne(pharmacyId, id);
    if (!user) throw new NotFoundException('Utilizador não encontrado.');
    return user;
  }

  async create(pharmacyId: string, dto: CreateUserDto) {
    if (await this.repo.findByEmailWithAuth(dto.email)) throw new ConflictException('Email já registado.');
    if (dto.roleName === 'ADMIN') throw new ForbiddenException('Criação de ADMIN requer aprovação da central.');

    const passwordHash = await this.hashPassword(dto.password);

    const user = await this.prisma.$transaction(async (tx: any) => {
      const role = await tx.role.findUnique({ where: { name: dto.roleName } });
      if (!role) throw new BadRequestException('Função inválida.');

      const newUser = await tx.user.create({
        data: { pharmacyId, email: dto.email, passwordHash, fullName: dto.fullName, status: dto.status ?? 'ACTIVE' },
      });

      await tx.userRole.create({ data: { userId: newUser.id, roleId: role.id } });
      await tx.auditLog.create({ data: { pharmacyId, action: 'user.create', entity: 'User', entityId: newUser.id } });
      return newUser;
    });
    return { id: user.id, email: user.email, fullName: user.fullName, status: user.status };
  }

  async update(pharmacyId: string, currentUserId: string, targetId: string, dto: UpdateUserDto) {
    if (currentUserId === targetId && dto.status && dto.status !== 'ACTIVE') {
      throw new ForbiddenException('Não pode suspender a própria conta.');
    }

    return this.prisma.$transaction(async (tx: any) => {
      const user = await tx.user.findFirst({ where: { id: targetId, pharmacyId }, include: { roles: { include: { role: true } } } });
      if (!user) throw new NotFoundException('Utilizador não encontrado.');

      if (dto.status === 'SUSPENDED' || dto.status === 'INACTIVE') {
        if (user.roles.some((r: any) => r.role.name === 'ADMIN')) {
          // Usa o bloqueio de linha (FOR UPDATE) na transacção
          const activeAdmins = await this.repo.countActiveAdminsForUpdate(tx, pharmacyId);
          if (activeAdmins <= 1) throw new ForbiddenException('Protecção: não é possível suspender a última conta de administrador activa.');
        }
      }

      const updated = await tx.user.update({ where: { id: targetId }, data: { fullName: dto.fullName, status: dto.status } });
      await tx.auditLog.create({ data: { pharmacyId, action: 'user.update', entity: 'User', entityId: targetId } });
      return { id: updated.id, fullName: updated.fullName, status: updated.status };
    });
  }

  async updateMyPassword(userId: string, dto: UpdatePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilizador não encontrado.');

    if (!(await bcrypt.compare(dto.currentPassword, user.passwordHash))) {
      throw new BadRequestException('Password actual incorreta.');
    }

    const newHash = await this.hashPassword(dto.newPassword);

    await this.prisma.$transaction(async (tx: any) => {
      await tx.user.update({ where: { id: userId }, data: { passwordHash: newHash } });
      // Auditoria da password (sem registar a password em si)
      await tx.auditLog.create({
        data: { userId, pharmacyId: user.pharmacyId, action: 'user.change_password', entity: 'User', entityId: userId }
      });
    });
    return { message: 'Password alterada com sucesso.' };
  }
}