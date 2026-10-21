import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async liveness(): Promise<{ status: 'ok'; uptime: number; timestamp: string }> {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  async readiness(): Promise<{ status: 'ok' | 'error'; database: 'up' | 'down'; timestamp: string }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', database: 'up', timestamp: new Date().toISOString() };
    } catch {
      return { status: 'error', database: 'down', timestamp: new Date().toISOString() };
    }
  }
}
