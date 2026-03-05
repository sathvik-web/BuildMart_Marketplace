// kyc.controller.ts
import { Controller, Get, Post, Body, HttpCode, HttpStatus } from "@nestjs/common";
import { KycService, UploadKycDocDto, SetWarehouseDto, SetBankDto } from "./kyc.service";
import { Roles, CurrentUser } from "../auth/decorators/index";
import { UserRole } from "@buildmart/database";

@Controller({ path: "kyc", version: "1" })
export class KycController {
  constructor(private kyc: KycService) {}
  @Get("status") @Roles(UserRole.VENDOR) status(@CurrentUser() u: any) { return this.kyc.getKycStatus(u.id); }
  @Post("documents") @Roles(UserRole.VENDOR) upload(@CurrentUser() u: any, @Body() dto: UploadKycDocDto) { return this.kyc.uploadDocument(u.id, dto); }
  @Post("warehouse") @HttpCode(HttpStatus.OK) @Roles(UserRole.VENDOR) warehouse(@CurrentUser() u: any, @Body() dto: SetWarehouseDto) { return this.kyc.setWarehouse(u.id, dto); }
  @Post("bank") @HttpCode(HttpStatus.OK) @Roles(UserRole.VENDOR) bank(@CurrentUser() u: any, @Body() dto: SetBankDto) { return this.kyc.setBankDetails(u.id, dto); }
}
