// ============================================================
// BuildMart — Auth Guards
// jwt-auth.guard.ts   — default; skippable via @Public()
// jwt-refresh.guard   — for the /auth/refresh route only
// roles.guard.ts      — enforces @Roles(...) decorator
// kyc.guard.ts        — enforces @RequireKyc() on vendor routes
// ============================================================

// ── jwt-auth.guard.ts ─────────────────────────────────────
import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { Observable } from "rxjs";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    // Skip auth for routes decorated with @Public()
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any) {
    if (err || !user) {
      throw new UnauthorizedException(err?.message ?? "Authentication required.");
    }
    return user;
  }
}

// ── jwt-refresh.guard.ts ──────────────────────────────────
@Injectable()
export class JwtRefreshGuard extends AuthGuard("jwt-refresh") {}

// ── roles.guard.ts ────────────────────────────────────────
import { CanActivate, ForbiddenException } from "@nestjs/common";
import { ROLES_KEY } from "../decorators/roles.decorator";
import { UserRole } from "@buildmart/database";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles?.length) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) return false;

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException(
        `Access restricted to: ${requiredRoles.join(", ")}.`,
      );
    }
    return true;
  }
}

// ── kyc.guard.ts ──────────────────────────────────────────
import { PrismaService } from "../../database/database.module";
import { REQUIRE_KYC_KEY } from "../decorators/require-kyc.decorator";
import { VendorKycStatus } from "@buildmart/database";

@Injectable()
export class KycGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requireKyc = this.reflector.getAllAndOverride<boolean>(REQUIRE_KYC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requireKyc) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user || user.role !== UserRole.VENDOR) return false;

    const vendor = await this.prisma.vendorProfile.findUnique({
      where: { userId: user.id },
      select: { kycStatus: true },
    });

    if (!vendor || vendor.kycStatus !== VendorKycStatus.APPROVED) {
      throw new ForbiddenException(
        "KYC verification required. Upload GSTIN, PAN, and Shop License.",
      );
    }
    return true;
  }
}
