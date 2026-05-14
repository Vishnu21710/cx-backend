import { ForbiddenException, Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const hash = await argon2.hash(dto.password);
    const user = await this.usersService.create({ ...dto, password: hash });
    const tokens = await this.getTokens(user.id, user.email);
    await this.updateRefreshToken(user.id, tokens.refreshToken);
    return tokens;
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new ForbiddenException('Invalid credentials');

    const valid = await argon2.verify(user.password, dto.password);
    if (!valid) throw new ForbiddenException('Invalid credentials');

    const tokens = await this.getTokens(user.id, user.email);
    await this.updateRefreshToken(user.id, tokens.refreshToken);
    return tokens;
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.usersService.findById(userId);
    if (!user?.hashedRefreshToken) throw new ForbiddenException('Access Denied');

    const rtMatches = await argon2.verify(user.hashedRefreshToken, refreshToken);
    if (!rtMatches) throw new ForbiddenException('Access Denied — token mismatch');

    // Token rotation: issue a brand new pair and hash the new RT
    const tokens = await this.getTokens(user.id, user.email);
    await this.updateRefreshToken(user.id, tokens.refreshToken);
    return tokens;
  }

  async logout(userId: string) {
    // Nullify hashed refresh token so old refresh tokens are permanently invalid
    await this.usersService.update(userId, { hashedRefreshToken: null });
  }

  async getTokens(userId: string, email: string) {
    const payload = { sub: userId, email };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: '1m', // per spec: 1 minute
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async updateRefreshToken(userId: string, rt: string) {
    const hashed = await argon2.hash(rt);
    await this.usersService.update(userId, { hashedRefreshToken: hashed });
  }
}