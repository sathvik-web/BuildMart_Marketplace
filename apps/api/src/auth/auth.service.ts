// ============================================================
// BuildMart — AuthService
// OTP → user upsert → token pair → session store
// ============================================================

import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";

import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../database/database.module";
import { OtpService } from "./otp.service";
import { TokenService } from "./token.service";

import { VerifyOtpDto } from "./dto/verify-otp.dto";
import { RegisterDto } from "./dto/register.dto";

import {
  UserRole,
  UserStatus,
  VendorKycStatus,
} from "@buildmart/database";

@Injectable()
export class AuthService {

  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly otpService: OtpService,
    private readonly tokenService: TokenService,
    private readonly config: ConfigService,
  ) {}

  // ─────────────────────────────────────────
  // 1. SEND OTP
  // ─────────────────────────────────────────

  async sendOtp(phone: string): Promise<void> {

    const e164 = this.normalizePhone(phone);

    await this.otpService.sendOtp(e164);

    this.logger.log(`OTP sent to ${this.maskPhone(e164)}`);
  }

  // ─────────────────────────────────────────
  // 2. VERIFY OTP
  // ─────────────────────────────────────────

  async verifyOtp(
    dto: VerifyOtpDto,
    ip: string,
    userAgent: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    user: SafeUser;
    isNewUser: boolean;
  }> {

    const e164 = this.normalizePhone(dto.phone);

    const verifiedPhone =
      await this.otpService.verifyOtp(e164, dto.otpToken);

    if (verifiedPhone !== e164) {
      throw new UnauthorizedException("Invalid or expired OTP.");
    }

    let isNewUser = false;

    let user = await this.prisma.user.findUnique({
      where: { phone: e164 },
      include: {
        vendorProfile: true,
        buyerProfile: true,
      },
    });

    if (!user) {

      isNewUser = true;

      user = await this.prisma.user.create({
        data: {
          phone: e164,
          name: "",
          role: UserRole.BUYER,
          status: UserStatus.ACTIVE,
        },
        include: {
          vendorProfile: true,
          buyerProfile: true,
        },
      });

      this.logger.log(`New user created: ${user.id}`);
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException("Account suspended.");
    }

    const { accessToken, refreshToken } =
      await this.tokenService.issueTokenPair(user, ip, userAgent);

    return {
      accessToken,
      refreshToken,
      user: this.toSafeUser(user),
      isNewUser,
    };
  }

  // ─────────────────────────────────────────
  // 3. COMPLETE REGISTRATION
  // ─────────────────────────────────────────

  async completeRegistration(
    userId: string,
    dto: RegisterDto,
  ): Promise<SafeUser> {

    if (!userId) {
      throw new BadRequestException("User ID missing in request.");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        vendorProfile: true,
        buyerProfile: true,
      },
    });

    if (!user) {
      throw new NotFoundException("User not found.");
    }

    if (user.name) {
      throw new ConflictException("Profile already completed.");
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },

      data: {
        name: dto.name,
        role: dto.role ?? UserRole.BUYER,

        ...(dto.role === UserRole.VENDOR
          ? {
              vendorProfile: {
                create: {
                  businessName: dto.businessName!,
                  gstinNumber: dto.gstinNumber!,
                  businessPan: dto.businessPan!,
                  shopLicenseNumber: dto.shopLicenseNumber!,
                  whatsappNumber: user.phone,
                  kycStatus: VendorKycStatus.PENDING,
                },
              },
            }
          : {
              buyerProfile: {
                create: {
                  companyName: dto.businessName ?? dto.name,
                },
              },
            }),
      },

      include: {
        vendorProfile: true,
        buyerProfile: true,
      },
    });

    return this.toSafeUser(updated);
  }

  // ─────────────────────────────────────────
  // 4. REFRESH TOKENS
  // ─────────────────────────────────────────

  async refreshTokens(
    rawRefreshToken: string,
    ip: string,
    userAgent: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {

    if (!rawRefreshToken) {
      throw new UnauthorizedException("No refresh token provided.");
    }

    return this.tokenService.rotateRefreshToken(
      rawRefreshToken,
      ip,
      userAgent,
    );
  }

  // ─────────────────────────────────────────
  // 5. LOGOUT
  // ─────────────────────────────────────────

  async logout(userId: string, rawRefreshToken: string) {

    await this.tokenService.revokeSession(
      userId,
      rawRefreshToken,
    );
  }

  // ─────────────────────────────────────────
  // 6. GET PROFILE
  // ─────────────────────────────────────────

  async getProfile(userId: string): Promise<SafeUser> {

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        vendorProfile: {
          select: {
            id: true,
            businessName: true,
            kycStatus: true,
            gstinNumber: true,
            avgRating: true,
            totalOrders: true,
          },
        },
        buyerProfile: true,
      },
    });

    if (!user) {
      throw new NotFoundException("User not found.");
    }

    return this.toSafeUser(user);
  }

  // ─────────────────────────────────────────
  // 7. LIST SESSIONS
  // ─────────────────────────────────────────

  async getUserSessions(userId: string) {

    return this.prisma.session.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        userAgent: true,
        ipAddress: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  // ─────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────

  private normalizePhone(phone: string): string {

    const digits = phone.replace(/\D/g, "");

    if (digits.length === 10) return `+91${digits}`;

    if (digits.length === 12 && digits.startsWith("91"))
      return `+${digits}`;

    if (phone.startsWith("+") && digits.length >= 11)
      return `+${digits}`;

    throw new BadRequestException("Invalid phone number format.");
  }

  private maskPhone(phone: string): string {

    return phone.replace(/(\+\d{2})\d{6}(\d{4})/, "$1xxxxxx$2");
  }

  private toSafeUser(user: any): SafeUser {

    const { firebaseUid, deletedAt, ...safe } = user;

    return safe;
  }

}

export type SafeUser = Omit<
  Awaited<ReturnType<PrismaService["user"]["findUniqueOrThrow"]>>,
  "firebaseUid" | "deletedAt"
>;