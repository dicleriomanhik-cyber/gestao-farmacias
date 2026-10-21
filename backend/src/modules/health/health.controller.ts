import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Liveness — não verifica dependências externas' })
  liveness() {
    return this.health.liveness();
  }

  @Public()
  @Get('ready')
  @ApiOperation({ summary: 'Readiness — devolve 503 se a BD estiver em baixo' })
  async readiness(@Res({ passthrough: false }) res: Response): Promise<void> {
    const result = await this.health.readiness();
    res.status(result.database === 'up' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE).json({
      success: result.database === 'up',
      data: result,
      timestamp: new Date().toISOString(),
    });
  }
}
