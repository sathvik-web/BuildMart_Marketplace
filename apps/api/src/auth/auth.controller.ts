// ============================================================
// BuildMart — Auth Controller
// POST /api/v1/auth/otp/send
// POST /api/v1/auth/otp/verify
// POST /api/v1/auth/register
// POST /api/v1/auth/refresh
// POST /api/v1/auth/logout
// GET  /api/v1/auth/me
// ============================================================

import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
  Ip,
  Headers,
} from "@nestjs/common";

import { FastifyReply, FastifyRequest } from "fastify";
import { Throttle } from "@nestjs/throttler";
import { ConfigService } from "@nestjs/config";

import { AuthService } from "./auth.service";
import { SendOtpDto } from "./dto/send-otp.dto";
import { VerifyOtpDto } from "./dto/verify-otp.dto";
import { RegisterDto } from "./dto/register.dto";

import { Public } from "./decorators/public.decorator";
import { CurrentUser } from "./decorators/current-user.decorator";
import { Roles } from "./decorators/roles.decorator";

import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { JwtRefreshGuard } from "./guards/jwt-refresh.guard";

import { UserRole } from "@buildmart/database";
import type { JwtPayload } from "./strategies/jwt.strategy";

@Controller({ path: "auth", version: "1" })
export class AuthController {

  private readonly isProd: boolean;
  private readonly cookieDomain?: string;

  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {
    this.isProd = config.get("NODE_ENV") === "production";
    this.cookieDomain = this.isProd
      ? config.get<string>("COOKIE_DOMAIN")
      : undefined;
  }

  // ─────────────────────────────────────────
  // 1. SEND OTP
  // ─────────────────────────────────────────

  @Public()
  @Post("otp/send")
  @HttpCode(HttpStatus.OK)
  @Throttle({ otp: { ttl: 60_000, limit: 5 } })
  async sendOtp(@Body() dto: SendOtpDto) {
    await this.authService.sendOtp(dto.phone);
    return { message: "OTP sent successfully." };
  }

  // ─────────────────────────────────────────
  // 2. VERIFY OTP
  // ─────────────────────────────────────────

  @Public()
  @Post("otp/verify")
  @HttpCode(HttpStatus.OK)
  @Throttle({ otp: { ttl: 60_000, limit: 10 } })
  async verifyOtp(
    @Body() dto: VerifyOtpDto,
    @Res({ passthrough: true }) res: FastifyReply,
    @Ip() ip: string,
    @Headers("user-agent") userAgent: string,
  ) {

    const { accessToken, refreshToken, user, isNewUser } =
      await this.authService.verifyOtp(dto, ip, userAgent);

    this.setTokenCookies(res, accessToken, refreshToken);

    return { user, isNewUser };
  }

  // ─────────────────────────────────────────
  // 3. COMPLETE REGISTRATION
  // ─────────────────────────────────────────

  @Post("register")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async register(
    @CurrentUser() user: JwtPayload,
    @Body() dto: RegisterDto,
  ) {

    const updatedUser =
      await this.authService.completeRegistration(user.sub, dto);

    return { user: updatedUser };
  }

  // ─────────────────────────────────────────
  // 4. REFRESH TOKEN
  // ─────────────────────────────────────────

  @Public()
  @UseGuards(JwtRefreshGuard)
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
    @Ip() ip: string,
    @Headers("user-agent") userAgent: string,
  ) {

    const refreshToken =
      (req.cookies as Record<string, string>)?.refresh_token;

    const { accessToken, refreshToken: newRefreshToken } =
      await this.authService.refreshTokens(refreshToken, ip, userAgent);

    this.setTokenCookies(res, accessToken, newRefreshToken);

    return { message: "Tokens refreshed." };
  }

  // ─────────────────────────────────────────
  // 5. LOGOUT
  // ─────────────────────────────────────────

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
    @CurrentUser() user: JwtPayload,
  ) {

    const refreshToken =
      (req.cookies as Record<string, string>)?.refresh_token;

    if (refreshToken) {
      await this.authService.logout(user.sub, refreshToken);
    }

    this.clearTokenCookies(res);

    return { message: "Logged out successfully." };
  }

  // ─────────────────────────────────────────
  // 6. GET CURRENT USER
  // ─────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Get("me")
  async me(@CurrentUser() user: JwtPayload) {
    return this.authService.getProfile(user.sub);
  }

  // ─────────────────────────────────────────
  // 7. ADMIN SESSION LIST
  // ─────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  @Get("sessions")
  async sessions(@CurrentUser() user: JwtPayload) {
    return this.authService.getUserSessions(user.sub);
  }

  // ─────────────────────────────────────────
  // COOKIE HELPERS
  // ─────────────────────────────────────────

  private setTokenCookies(
    res: FastifyReply,
    accessToken: string,
    refreshToken: string,
  ) {

    const secure = this.isProd;

    res.setCookie("access_token", accessToken, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      domain: this.cookieDomain,
      path: "/",
      maxAge: 60 * 15,
    });

    res.setCookie("refresh_token", refreshToken, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      domain: this.cookieDomain,
      path: "/api/v1/auth/refresh",
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  private clearTokenCookies(res: FastifyReply) {

    res.clearCookie("access_token", {
      path: "/",
      domain: this.cookieDomain,
    });

    res.clearCookie("refresh_token", {
      path: "/api/v1/auth/refresh",
      domain: this.cookieDomain,
    });
  }

}