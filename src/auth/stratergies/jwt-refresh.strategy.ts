import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';

export interface JwtRefreshPayload {
  sub: string;
  email: string;
  refreshToken: string;
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => (req as any)?.cookies?.refresh_token ?? null,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      secretOrKey: configService.get<string>('JWT_REFRESH_SECRET') as string,
      passReqToCallback: true as true, // typed literal true for StrategyOptionsWithRequest
      ignoreExpiration: false,
    });
  }

  async validate(req: Request, payload: { sub: string; email: string }): Promise<JwtRefreshPayload> {
    const refreshToken =
      (req as any)?.cookies?.refresh_token ??
      ((req as any).body as { refreshToken?: string })?.refreshToken ??
      '';

    return { sub: payload.sub, email: payload.email, refreshToken };
  }
}
