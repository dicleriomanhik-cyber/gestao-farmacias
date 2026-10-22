import { BadRequestException, ForbiddenException, Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { UsersRepository } from './users.repository';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { UserStatus } from '@prisma/client';

export class AccountDisabledError extends ForbiddenException {
  constructor() {
    super({ message: 'Conta inativa ou suspensa.', code: 'ACCOUNT_DISABLED' });
  }
}

export class InvalidCredentialsError extends ForbiddenException {
  constructor() {
    super({ message: 'Credenciais inválidas.', code: 'INVALID_CREDENTIALS' });
  }
}

@Injectable()
export class UsersService {
  constructor(
    private readonly repo: UsersRepository,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async hashPassword(plain: string): Promise<string> {
    const rounds = this.config.get<number>('bcryptSaltRounds') ?? 12;
    return bcrypt.hash(plain, rounds);
  }

  async validateCredentials(email: string, password: string): Promise<AuthenticatedUser> {
    const record = await this.repo.findByEmailWithAuth(email);
    if (!record) throw new InvalidCredentialsError();
    if (record.pharmacy?.status !== 'ACTIVE') throw new AccountDisabledError();
    if (record.status !== 'ACTIVE') throw new AccountDisabledError();

    const ok = await bcrypt.compare(password, record.passwordHash);
    if (!ok) throw new InvalidCredentialsError();

    const roles = record.roles.map((ur) => ur.role.name);
    const permissions = Array.from(
      new Set(record.roles.flatMap((ur) => ur.role.permissions.map((rp) => rp.permission.code))),
    );
    await this.repo.updateLastLogin(record.id);
    return {
      id: record.id,
      email: record.email,
      pharmacyId: record.pharmacyId,
      roles,
      permissions,
    };
  }

  async findAuthenticatedUser(id: string): Promise<AuthenticatedUser | null> {
    const record = await this.repo.findByIdWithAuth(id);
    if (!record || record.status !== 'ACTIVE' || record.pharmacy?.status !== 'ACTIVE') return null;
    
    const roles = record.roles.map((ur) => ur.role.name);
    const permissions = Array.from(
      new Set(record.roles.flatMap((ur) => ur.role.permissions.map((rp) => rp.permission.code))),
    );
    return {
      id: record.id,
      email: record.email,
      pharmacyId: record.pharmacyId,
      roles,
      permissions,
    };
  }

  async findAll(pharmacyId: string, page: number, limit: number, search?: string) {
    const take = Math.min(Math.max(limit, 1), 100);
    const skip = Math.max((page - 1) * take, 0);
    const { data, total } = await this.repo.findAll(pharmacyId, skip, take, search);
    return {
      data: data.map((u) => ({
        id: u.id,
        email: u.email,
        fullName: u.fullName,
        status: u.status,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        roles: u.roles.map((ur) => ur.role.name),
      })),
      meta: {
        total,
        page,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  async findOne(pharmacyId: string, id: string) {
    const user = await this.repo.findOne(pharmacyId, id);
    if (!user) throw new NotFoundException('Utilizador não encontrado.');
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      roles: user.roles.map((ur) => ur.role.name),
    };
  }

  async create(pharmacyId: string, dto: CreateUserDto) {
    const existing = await this.repo.findByEmailWithAuth(dto.email);
    if (existing) throw new ConflictException('Email já registado.');
    if (dto.roleName === 'ADMIN') throw new ForbiddenException('Criação de ADMIN requer aprovação da central.');

    const passwordHash = await this.hashPassword(dto.password);
    
    const user = await this.prisma.$transaction(async (tx) => {
      const role = await tx.role.findUnique({ where: { name: dto.roleName } });
      if (!role) throw new BadRequestException('Função inválida.');

      const newUser = await tx.user.create({
        data: { 
          pharmacyId, 
          email: dto.email, 
          passwordHash, 
          fullName: dto.fullName, 
          status: dto.status ?? UserStatus.ACTIVE 
        },
      });

      await tx.userRole.create({ data: { userId: newUser.id, roleId: role.id } });
      await tx.auditLog.create({ data: { pharmacyId, action: 'user.create', entity: 'User', entityId: newUser.id } });
      
      return newUser;
    });
    
    return { id: user.id, email: user.email, fullName: user.fullName, status: user.status };
  }

  async update(pharmacyId: string, currentUserId: string, targetId: string, dto: UpdateUserDto) {
    const user = await this.repo.findOne(pharmacyId, targetId);
    if (!user) throw new NotFoundException('Utilizador não encontrado.');

    if (user.id === currentUserId && dto.status && dto.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('Não pode suspender a própria conta.');
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.status === UserStatus.SUSPENDED || dto.status === UserStatus.INACTIVE) {
        const isTargetAdmin = user.roles.some((r) => r.role.name === 'ADMIN');
        if (isTargetAdmin) {
          const activeAdmins = await this.repo.countActiveAdminsForUpdate(tx, pharmacyId);
          if (activeAdmins <= 1) {
            throw new ForbiddenException('Protecção: não é possível suspender a última conta de administrador activa.');
          }
        }
      }

      const updated = await tx.user.update({ 
        where: { id: targetId }, 
        data: { fullName: dto.fullName, status: dto.status } 
      });
      await tx.auditLog.create({ data: { pharmacyId, action: 'user.update', entity: 'User', entityId: targetId } });
      return { id: updated.id, fullName: updated.fullName, status: updated.status };
    });
  }

  async updateMyPassword(userId: string, dto: UpdatePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilizador não encontrado.');
    
    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) throw new BadRequestException('Password actual incorreta.');

    const newHash = await this.hashPassword(dto.newPassword);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { passwordHash: newHash } });
      await tx.auditLog.create({
        data: {
          userId,
          pharmacyId: user.pharmacyId,
          action: 'user.change_password',
          entity: 'User',
          entityId: userId,
        },
      });
    });
    return { message: 'Password alterada com sucesso.' };
  }
}
