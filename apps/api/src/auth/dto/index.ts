// ============================================================
// BuildMart — Auth DTOs (with class-validator)
// ============================================================

import {
  IsString,
  IsNotEmpty,
  IsPhoneNumber,
  MinLength,
  IsEmail,
  IsOptional,
  IsEnum,
  ValidateIf,
  IsAlphanumeric,
  Length,
  Matches,
} from "class-validator";
import { Transform } from "class-transformer";
import { UserRole } from "@buildmart/database";

// ── POST /auth/otp/send ───────────────────────────────────
export class SendOtpDto {
  @IsPhoneNumber("IN")
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  phone: string;
}

// ── POST /auth/otp/verify ─────────────────────────────────
export class VerifyOtpDto {
  @IsPhoneNumber("IN")
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  phone: string;

  /**
   * Either:
   *   - A Firebase ID token (JWT, ~1000 chars) from the client SDK, OR
   *   - A 6-digit numeric OTP from the Twilio fallback path.
   */
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  otpToken: string;
}

// ── POST /auth/register ───────────────────────────────────
export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @Transform(({ value }) => value?.trim())
  name: string;

  @IsEmail()
  @IsOptional()
  @Transform(({ value }) => value?.toLowerCase().trim())
  email?: string;

  @IsPhoneNumber("IN")
  @IsOptional()
  phone?: string;

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  // ── Buyer fields ──────────────────────────────────────
  @ValidateIf((o) => o.role !== UserRole.VENDOR)
  @IsString()
  @IsOptional()
  companyName?: string;

  // ── Vendor fields (required when role = VENDOR) ───────
  @ValidateIf((o) => o.role === UserRole.VENDOR)
  @IsString()
  @IsNotEmpty({ message: "Business name is required for vendors." })
  businessName?: string;

  @ValidateIf((o) => o.role === UserRole.VENDOR)
  @IsString()
  @Length(15, 15, { message: "GSTIN must be exactly 15 characters." })
  @Matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, {
    message: "Invalid GSTIN format.",
  })
  gstinNumber?: string;

  @ValidateIf((o) => o.role === UserRole.VENDOR)
  @IsString()
  @Length(10, 10, { message: "PAN must be exactly 10 characters." })
  @Matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, {
    message: "Invalid PAN format.",
  })
  businessPan?: string;

  @ValidateIf((o) => o.role === UserRole.VENDOR)
  @IsString()
  @IsNotEmpty({ message: "Shop License number is required for vendors." })
  shopLicenseNumber?: string;
}
