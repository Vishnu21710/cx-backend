import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { GetUser } from '../common/decorators/get-user.decorator';

interface TokenPair {
  sub: string;
  email: string;
  refreshToken: string;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ─── Register ────────────────────────────────────────────────────────────────
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered, tokens returned' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.register(dto);
    this.setTokenCookies(res, tokens);
    return tokens;
  }

  // ─── Login ───────────────────────────────────────────────────────────────────
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email & password' })
  @ApiResponse({ status: 200, description: 'Authenticated, tokens returned' })
  @ApiResponse({ status: 403, description: 'Invalid credentials' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.login(dto);
    this.setTokenCookies(res, tokens);
    return tokens;
  }

  // ─── Refresh Tokens ──────────────────────────────────────────────────────────
  @Post('refresh')
  @UseGuards(JwtRefreshGuard)
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth('cookie-auth')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Refresh access token using refresh token (cookie or body)' })
  @ApiResponse({ status: 200, description: 'New token pair issued (rotation)' })
  @ApiResponse({ status: 403, description: 'Invalid or expired refresh token' })
  async refresh(
    @GetUser() user: TokenPair,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.refreshTokens(user.sub, user.refreshToken);
    this.setTokenCookies(res, tokens);
    return tokens;
  }

  // ─── Logout ──────────────────────────────────────────────────────────────────
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiCookieAuth('cookie-auth')
  @ApiOperation({ summary: 'Logout — invalidates refresh token' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(
    @GetUser('sub') userId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(userId);
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
    return { message: 'Logged out successfully' };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  private setTokenCookies(
    res: Response,
    tokens: { accessToken: string; refreshToken: string },
  ) {
    const isProd = process.env.NODE_ENV === 'production';

    res.cookie('access_token', tokens.accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'strict' : 'lax',
      maxAge: 60 * 1000, // 1 minute
    });

    res.cookie('refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }
}