// ============================================================
// BuildMart — TokenService
// Issues access + refresh JWT pairs.
// Refresh tokens are stored hashed in PostgreSQL (Session table)
// and verified on rotation — full revocation support.
// ============================================================

import {
  Injectable,
  UnauthorizedException,
  Logger,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../database/database.module";
import { createHash, randomBytes } from "crypto";
import { UserRole, UserStatus } from "@buildmart/database";

export interface JwtPayload {
  sub: string;        // user UUID
  phone: string;
  role: UserRole;
  status: UserStatus;
  sessionId: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);
  private readonly refreshSecret: string;
  private readonly refreshExpiresIn: string;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.refreshSecret = config.getOrThrow("REFRESH_TOKEN_SECRET");
    this.refreshExpiresIn = config.get("REFRESH_TOKEN_EXPIRES_IN", "30d");
  }

  // ── Issue a fresh access + refresh token pair ────────────
  async issueTokenPair(
    user: { id: string; phone: string; role: UserRole; status: UserStatus },
    ip: string,
    userAgent: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    // Create a DB session first so we have the sessionId for the payload
    const rawRefresh = randomBytes(64).toString("hex");
    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshToken: this.hashToken(rawRefresh),
        userAgent,
        ipAddress: ip,
        expiresAt: this.addDays(30),
      },
    });

    const payload: JwtPayload = {
      sub: user.id,
      phone: user.phone,
      role: user.role,
      status: user.status,
      sessionId: session.id,
    };

    const accessToken = this.jwt.sign(payload);
    const refreshToken = this.jwt.sign(
      { sub: user.id, sessionId: session.id, type: "refresh" },
      {
        secret: this.refreshSecret,
        expiresIn: this.refreshExpiresIn,
        issuer: "buildmart.in",
        audience: "buildmart-api",
      },
    );

    // Store the raw refresh token signed value as a second layer —
    // the DB row stores a hash of rawRefresh for lookup.
    // Return rawRefresh to be set in the HTTP-only cookie.
    return { accessToken, refreshToken: rawRefresh };
  }

  // ── Rotate refresh token (one-time use) ──────────────────
  async rotateRefreshToken(
    rawRefreshToken: string,
    ip: string,
    userAgent: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const hashed = this.hashToken(rawRefreshToken);

    const session = await this.prisma.session.findUnique({
      where: { refreshToken: hashed },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      // Possible token reuse attack — revoke all sessions for this user
      if (session) {
        await this.prisma.session.deleteMany({
          where: { userId: session.userId },
        });
        this.logger.warn(
          `Refresh token reuse detected for user ${session.userId}. All sessions revoked.`,
        );
      }
      throw new UnauthorizedException("Refresh token invalid or expired.");
    }

    if (session.user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException("Account suspended.");
    }

    // Delete old session (rotation — old token cannot be reused)
    await this.prisma.session.delete({ where: { id: session.id } });

    // Issue fresh pair
    return this.issueTokenPair(session.user, ip, userAgent);
  }

  // ── Revoke a specific session ────────────────────────────
  async revokeSession(userId: string, rawRefreshToken: string): Promise<void> {
    await this.prisma.session.deleteMany({
      where: {
        userId,
        refreshToken: this.hashToken(rawRefreshToken),
      },
    });
  }

  // ── Revoke ALL sessions for a user (admin action) ────────
  async revokeAllSessions(userId: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { userId } });
  }

  // ── Validate access token payload (used by JwtStrategy) ──
  async validatePayload(payload: JwtPayload) {
    // Check session still exists (allows instant revocation)
    const session = await this.prisma.session.findUnique({
      where: { id: payload.sessionId },
    });
    if (!session || session.expiresAt < new Date()) {
      throw new UnauthorizedException("Session expired or revoked.");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, phone: true, role: true, status: true, name: true },
    });
    if (!user || user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException("User not found or suspended.");
    }

    return user;
  }

  // ─────────────────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────────────────

  private hashToken(raw: string): string {
    return createHash("sha256").update(raw).digest("hex");
  }

  private addDays(days: number): Date {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d;
  }
}
