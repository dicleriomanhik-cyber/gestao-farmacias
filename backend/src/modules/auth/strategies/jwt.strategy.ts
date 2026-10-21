import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';
import { JwtPayload } from '../types/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly users: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.accessSecret') as string,
    });
  }

  async validate(payload: JwtPayload) {
    if (payload.type !== 'access') throw new UnauthorizedException('Tipo de token inválido.');
    // Releitura do BD: estado, roles e permissões atuais prevalecem sobre o token.
    const user = await this.users.findAuthenticatedUser(payload.sub);
    if (!user) throw new UnauthorizedException('Utilizador inválido ou inativo.');
    if (user.pharmacyId !== payload.pharmacyId) {
      throw new UnauthorizedException('Contexto de farmácia divergente.');
    }
    return user;
  }
}
