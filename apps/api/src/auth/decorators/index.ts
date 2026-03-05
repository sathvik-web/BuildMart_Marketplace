// ============================================================
// BuildMart — Custom Decorators
// ============================================================

import { SetMetadata, createParamDecorator, ExecutionContext } from "@nestjs/common";
import { UserRole } from "@buildmart/database";

// ── @Public() — skips JwtAuthGuard ────────────────────────
export const IS_PUBLIC_KEY = "isPublic";
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// ── @Roles(...roles) — enforced by RolesGuard ─────────────
export const ROLES_KEY = "roles";
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

// ── @RequireKyc() — enforced by KycGuard ──────────────────
export const REQUIRE_KYC_KEY = "requireKyc";
export const RequireKyc = () => SetMetadata(REQUIRE_KYC_KEY, true);

// ── @CurrentUser() — extracts user from JWT payload ───────
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
