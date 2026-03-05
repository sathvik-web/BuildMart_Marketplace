import { IsString, IsOptional, IsEnum } from "class-validator";
import { UserRole } from "@buildmart/database";

export class RegisterDto {

  @IsString()
  name: string;

  @IsString()
  phone: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsOptional()
  @IsString()
  businessName?: string;

  @IsOptional()
  @IsString()
  gstinNumber?: string;

  @IsOptional()
  @IsString()
  businessPan?: string;

  @IsOptional()
  @IsString()
  shopLicenseNumber?: string;
}