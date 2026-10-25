import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './types/jwt-payload.interface';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';

export class RefreshReuseError extends UnauthorizedException {
  constructor() {
    super({ message: 'Refresh token reutilizado. Sessão revogada por segurança.', code: 'TOKEN_REUSED' });
  }
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
  user: AuthenticatedUser;
}

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private signAccess(user: AuthenticatedUser): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id, email: user.email, pharmacyId: user.pharmacyId,
      roles: user.roles, permissions: user.permissions, type: 'access',
    };
    return this.jwt.signAsync(payload, {
      secret: this.config.get<string>('jwt.accessSecret'),
      expiresIn: this.config.get<string>('jwt.accessExpiresIn'),
    });
  }

  private signRefresh(user: AuthenticatedUser, jti: string, familyId: string): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id, email: user.email, pharmacyId: user.pharmacyId,
      roles: user.roles, permissions: user.permissions, type: 'refresh',
      jti, fam: familyId,
    };
    return this.jwt.signAsync(payload, {
      secret: this.config.get<string>('jwt.refreshSecret'),
      expiresIn: this.config.get<string>('jwt.refreshExpiresIn'),
    });
  }

  async login(dto: LoginDto, meta: { ip?: string; userAgent?: string }): Promise<LoginResult> {
    let user: AuthenticatedUser;
    try {
      user = await this.users.validateCredentials(dto.email, dto.password);
    } catch (err) {
      await this.prisma.loginAttempt.create({
        data: { email: dto.email, ipAddress: meta.ip ?? 'unknown', success: false },
      });
      throw err;
    }
    await this.prisma.loginAttempt.create({
      data: { email: dto.email, ipAddress: meta.ip ?? 'unknown', success: true },
    });

    const familyId = randomUUID();
    const jti = randomUUID();
    const refreshToken = await this.signRefresh(user, jti, familyId);
    const accessToken = await this.signAccess(user);

    await this.prisma.refreshToken.create({
      data: {
        jti, familyId, userId: user.id,
        tokenHash: sha256(refreshToken),
        expiresAt: this.expiryFromString(this.config.get<string>('jwt.refreshExpiresIn') ?? '7d'),
        ipAddress: meta.ip ?? null,
        userAgent: meta.userAgent ?? null,
      },
    });

    return {
      accessToken, refreshToken, tokenType: 'Bearer',
      expiresIn: this.config.get<string>('jwt.accessExpiresIn') ?? '15m',
      user,
    };
  }

  async refresh(
    rawRefresh: string,
    meta: { ip?: string; userAgent?: string },
  ): Promise<LoginResult> {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(rawRefresh, {
        secret: this.config.get<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido.');
    }
    if (payload.type !== 'refresh' || !payload.jti || !payload.fam) {
      throw new UnauthorizedException('Tipo de token inválido.');
    }

    const existing = await this.prisma.refreshToken.findUnique({ where: { jti: payload.jti } });
    if (!existing) throw new UnauthorizedException('Refresh token desconhecido.');
    if (sha256(rawRefresh) !== existing.tokenHash) {
      throw new UnauthorizedException('Refresh token inválido.');
    }
    if (existing.revokedAt) {
      // Reutilização → revoga a família inteira.
      await this.prisma.refreshToken.updateMany({
        where: { familyId: existing.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new RefreshReuseError();
    }
    if (existing.expiresAt <= new Date()) {
      throw new UnauthorizedException('Refresh token expirado.');
    }

    const user = await this.users.findAuthenticatedUser(payload.sub);
    if (!user) throw new UnauthorizedException('Utilizador inválido.');

    const newJti = randomUUID();
    const newRefresh = await this.signRefresh(user, newJti, existing.familyId);
    const accessToken = await this.signAccess(user);

    await this.prisma.$transaction(async (tx) => {
      const created = await tx.refreshToken.create({
        data: {
          jti: newJti, familyId: existing.familyId, userId: user.id,
          tokenHash: sha256(newRefresh),
          expiresAt: this.expiryFromString(this.config.get<string>('jwt.refreshExpiresIn') ?? '7d'),
          ipAddress: meta.ip ?? null,
          userAgent: meta.userAgent ?? null,
        },
      });
      await tx.refreshToken.update({
        where: { jti: existing.jti },
        data: { revokedAt: new Date(), replacedById: created.id },
      });
    });

    return {
      accessToken, refreshToken: newRefresh, tokenType: 'Bearer',
      expiresIn: this.config.get<string>('jwt.accessExpiresIn') ?? '15m',
      user,
    };
  }

  async logout(rawRefresh: string, userId: string): Promise<void> {
    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(rawRefresh, {
        secret: this.config.get<string>('jwt.refreshSecret'),
      });
      if (payload.type !== 'refresh' || !payload.fam) return;
      await this.prisma.refreshToken.updateMany({
        where: { familyId: payload.fam, userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } catch {
      // logout é idempotente; token inválido não é erro exposto
    }
  }

  private expiryFromString(expr: string): Date {
    const m = /^(\d+)([smhd])$/.exec(expr);
    if (!m) return new Date(Date.now() + 7 * 24 * 3600 * 1000);
    const n = parseInt(m[1], 10);
    const unit = m[2];
    const ms = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit] as number;
    return new Date(Date.now() + n * ms);
  }
  async register(dto: any) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new UnauthorizedException('Email já registado.');
    const passwordHash = await bcrypt.hash(dto.password, this.config.get<number>('bcryptSaltRounds') ?? 12);
    return this.prisma.$transaction(async (tx) => {
      const pharmacy = await tx.pharmacy.create({ data: { name: dto.pharmacyName, nif: dto.pharmacyNif ?? null, status: 'ACTIVE' } });
      const roleAdmin = await tx.role.findUnique({ where: { name: 'ADMIN' } });
      if (!roleAdmin) throw new UnauthorizedException('Role ADMIN não configurada.');
      const user = await tx.user.create({ data: { pharmacyId: pharmacy.id, email: dto.email, passwordHash, fullName: dto.adminName, status: 'ACTIVE' } });
      await tx.userRole.create({ data: { userId: user.id, roleId: roleAdmin.id } });
      return { message: 'Conta criada com sucesso.' };
    });
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return { message: 'Se o email existir, receberá um link.' };
    const token = randomBytes(32).toString('hex');
    const tokenHash = sha256(token);
    const expiresAt = new Date(Date.now() + 3600_000);
    await this.prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash, expiresAt } });
    return { message: 'Token gerado.', token };
  }

  async resetPassword(dto: any) {
    const tokenHash = sha256(dto.token);
    const resetRecord = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!resetRecord || resetRecord.expiresAt < new Date()) throw new UnauthorizedException('Token inválido ou expirado.');
    const passwordHash = await bcrypt.hash(dto.newPassword, this.config.get<number>('bcryptSaltRounds') ?? 12);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: resetRecord.userId }, data: { passwordHash } }),
      this.prisma.passwordResetToken.delete({ where: { id: resetRecord.id } }),
    ]);
    return { message: 'Password redefinida com sucesso.' };
  }}
