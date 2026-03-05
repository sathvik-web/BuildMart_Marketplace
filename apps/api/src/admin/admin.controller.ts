// admin.controller.ts
import { Controller, Get, Post, Body, Param, ParseUUIDPipe, HttpCode, HttpStatus } from "@nestjs/common";
import { AdminService } from "./admin.service";
import { Roles, CurrentUser } from "../auth/decorators";
import { UserRole } from "@buildmart/database";
import { IsString, IsEnum } from "class-validator";

class ApproveKycDto {}

class RejectKycDto {
  @IsString()
  reason: string;
}

class ResolveDisputeDto {
  @IsEnum(["refund", "release"])
  action: "refund" | "release";

  @IsString()
  reason: string;
}

class SuspendUserDto {
  @IsString()
  reason: string;
}

@Controller({ path: "admin", version: "1" })
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  // Dashboard stats
  @Get("dashboard")
  stats(): Promise<any> {
    return this.admin.getDashboardStats();
  }

  // List pending KYC
  @Get("kyc/pending")
  pendingKyc(): Promise<any> {
    return this.admin.listPendingKyc();
  }

  // Approve KYC
  @Post("kyc/:id/approve")
  @HttpCode(HttpStatus.OK)
  approveKyc(
    @CurrentUser() u: any,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<any> {
    return this.admin.approveKyc(u.id, id);
  }

  // Reject KYC
  @Post("kyc/:id/reject")
  @HttpCode(HttpStatus.OK)
  rejectKyc(
    @CurrentUser() u: any,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: RejectKycDto,
  ): Promise<any> {
    return this.admin.rejectKyc(u.id, id, dto.reason);
  }

  // List disputes
  @Get("disputes")
  listDisputes(): Promise<any> {
    return this.admin.listDisputes();
  }

  // Resolve dispute
  @Post("disputes/:id/resolve")
  @HttpCode(HttpStatus.OK)
  resolveDispute(
    @CurrentUser() u: any,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ResolveDisputeDto,
  ): Promise<any> {
    return this.admin.resolveDispute(u.id, id, dto.action, dto.reason);
  }

  // Suspend user
  @Post("users/:id/suspend")
  @HttpCode(HttpStatus.OK)
  suspendUser(
    @CurrentUser() u: any,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: SuspendUserDto,
  ): Promise<any> {
    return this.admin.suspendUser(u.id, id, dto.reason);
  }
}