// ============================================================
// BuildMart — Auth Controller
// POST /api/v1/auth/otp/send
// POST /api/v1/auth/otp/verify
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
  Version,
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
import { JwtRefreshGuard } from "./guards/jwt-refresh.guard";
import { UserRole } from "@buildmart/database";
import type { JwtPayload } from "./strategies/jwt.strategy";

@Controller({ path: "auth", version: "1" })
export class AuthController {
  private readonly isProd: boolean;
  private readonly cookieDomain: string;

  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {
    this.isProd = config.get("NODE_ENV") === "production";
    this.cookieDomain = config.get<string>("COOKIE_DOMAIN", "localhost");
  }

  // ── 1. Request OTP ────────────────────────────────────────
  // Rate limit: 5 OTP requests per minute per IP (see ThrottlerModule "otp")
  @Public()
  @Post("otp/send")
  @HttpCode(HttpStatus.OK)
  @Throttle({ otp: { ttl: 60_000, limit: 5 } })
  async sendOtp(@Body() dto: SendOtpDto) {
    await this.authService.sendOtp(dto.phone);
    return { message: "OTP sent successfully." };
  }

  // ── 2. Verify OTP → issue tokens ─────────────────────────
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

  // ── 3. Complete registration (new users only) ─────────────
  @Post("register")
  @HttpCode(HttpStatus.OK)
  async register(
    @CurrentUser() user: JwtPayload,
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const updated = await this.authService.completeRegistration(user.sub, dto);
    return { user: updated };
  }

  // ── 4. Refresh access token ───────────────────────────────
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
    const refreshToken = (req.cookies as Record<string, string>)["refresh_token"];
    const { accessToken, refreshToken: newRefreshToken } =
      await this.authService.refreshTokens(refreshToken, ip, userAgent);

    this.setTokenCookies(res, accessToken, newRefreshToken);
    return { message: "Tokens refreshed." };
  }

  // ── 5. Logout — clear cookies + revoke session ────────────
  @Post("logout")
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
    @CurrentUser() user: JwtPayload,
  ) {
    const refreshToken = (req.cookies as Record<string, string>)["refresh_token"];
    if (refreshToken) {
      await this.authService.logout(user.sub, refreshToken);
    }
    this.clearTokenCookies(res);
    return { message: "Logged out successfully." };
  }

  // ── 6. Current user profile ───────────────────────────────
  @Get("me")
  async me(@CurrentUser() user: JwtPayload) {
    return this.authService.getProfile(user.sub);
  }

  // ── Admin-only: list all sessions ─────────────────────────
  @Get("sessions")
  @Roles(UserRole.ADMIN)
  async sessions(@CurrentUser() user: JwtPayload) {
    return this.authService.getUserSessions(user.sub);
  }

  // ─────────────────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────────────────

  private setTokenCookies(
    res: FastifyReply,
    accessToken: string,
    refreshToken: string,
  ) {
    const secure = this.isProd;
    const domain = this.isProd ? this.cookieDomain : undefined;

    // Access token: 15m, readable by JS is NOT needed — HTTP-only
    res.setCookie("access_token", accessToken, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      domain,
      path: "/",
      maxAge: 15 * 60, // 15 minutes in seconds
    });

    // Refresh token: 30d, scoped to /api/v1/auth/refresh only
    res.setCookie("refresh_token", refreshToken, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      domain,
      path: "/api/v1/auth/refresh",
      maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
    });
  }

  private clearTokenCookies(res: FastifyReply) {
    res.clearCookie("access_token", { path: "/" });
    res.clearCookie("refresh_token", { path: "/api/v1/auth/refresh" });
  }
}
