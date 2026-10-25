import { Body, Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { LoginThrottleGuard } from '../../common/guards/login-throttle.guard';
import { AuthService, LoginResult } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RefreshDto } from './dto/refresh.dto';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @UseGuards(LoginThrottleGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Autenticar e obter access+refresh tokens' })
  login(@Body() dto: LoginDto, @Req() req: Request): Promise<LoginResult> {
    return this.auth.login(dto, {
      ip: (req.ip ?? '').toString(),
      userAgent: (req.headers['user-agent'] ?? '').toString(),
    });
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotacionar refresh token (detecta reutilização)' })
  refresh(@Body() dto: RefreshDto, @Req() req: Request): Promise<LoginResult> {
    return this.auth.refresh(dto.refreshToken, {
      ip: (req.ip ?? '').toString(),
      userAgent: (req.headers['user-agent'] ?? '').toString(),
    });
  }

  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revogar toda a família de refresh tokens do utilizador' })
  async logout(
    @Body() dto: RefreshDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.auth.logout(dto.refreshToken, user.id);
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Registar nova farmácia e administrador' })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pedir recuperação de password' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto.email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Redefinir password com token' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto);
  }}
