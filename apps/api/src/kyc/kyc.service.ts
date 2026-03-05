// kyc.service.ts
import { Injectable, NotFoundException, BadRequestException, Logger } from "@nestjs/common";
import { PrismaService } from "../database/database.module";
import { NotificationService } from "../notification/notification.service";
import { VendorKycStatus } from "@buildmart/database";
import { IsString, IsOptional, IsArray, ValidateNested } from "class-validator";

export class UploadKycDocDto { @IsString() documentType: string; @IsString() fileUrl: string; @IsString() fileKey: string; @IsString() mimeType: string; fileSize: number; }
export class SetWarehouseDto { warehouseLat: number; warehouseLng: number; serviceRadiusKm?: number; @IsArray() @IsOptional() categories?: string[]; }
export class SetBankDto { @IsString() bankAccountName: string; @IsString() bankAccountNumber: string; @IsString() bankIfscCode: string; }

@Injectable()
export class KycService {
  private readonly logger = new Logger(KycService.name);
  constructor(private prisma: PrismaService, private notif: NotificationService) {}

  async getKycStatus(vendorUserId: string): Promise<any> {
    const v = await this.prisma.vendorProfile.findUnique({ where: { userId: vendorUserId }, include: { kycDocuments: true, categories: true } });
    if (!v) throw new NotFoundException("Vendor profile not found.");
    return v;
  }

  async uploadDocument(vendorUserId: string, dto: UploadKycDocDto) {
    const v = await this.prisma.vendorProfile.findUnique({ where: { userId: vendorUserId }, select: { id: true, kycStatus: true } });
    if (!v) throw new NotFoundException("Vendor not found.");
    if (v.kycStatus === VendorKycStatus.APPROVED) throw new BadRequestException("KYC already approved.");

    const doc = await this.prisma.vendorKycDocument.create({ data: { vendorProfileId: v.id, documentType: dto.documentType, fileUrl: dto.fileUrl, fileKey: dto.fileKey, mimeType: dto.mimeType, fileSizeBytes: dto.fileSize } });

    // Auto-submit after all 3 docs uploaded (GSTIN, PAN, SHOP_LICENSE)
    const docs = await this.prisma.vendorKycDocument.findMany({ where: { vendorProfileId: v.id } });
    const types = docs.map(d => d.documentType);
    if (types.includes("GSTIN_CERT") && types.includes("PAN_CARD") && types.includes("SHOP_LICENSE")) {
      await this.prisma.vendorProfile.update({ where: { id: v.id }, data: { kycStatus: VendorKycStatus.SUBMITTED } });
    }
    return doc;
  }

  async setWarehouse(vendorUserId: string, dto: SetWarehouseDto) {
    const { Prisma } = await import("@buildmart/database");
    const v = await this.prisma.vendorProfile.findUnique({ where: { userId: vendorUserId }, select: { id: true } });
    if (!v) throw new NotFoundException("Vendor not found.");

    await this.prisma.$transaction([
      this.prisma.vendorProfile.update({ where: { id: v.id }, data: { warehouseLat: new Prisma.Decimal(dto.warehouseLat), warehouseLng: new Prisma.Decimal(dto.warehouseLng), serviceRadiusKm: dto.serviceRadiusKm ?? 50 } }),
      ...(dto.categories ? [this.prisma.vendorCategory.deleteMany({ where: { vendorProfileId: v.id } }), this.prisma.vendorCategory.createMany({ data: (dto.categories as any[]).map(c => ({ vendorProfileId: v.id, category: c })) })] : []),
    ]);
    return { message: "Warehouse location updated." };
  }

  async setBankDetails(vendorUserId: string, dto: SetBankDto): Promise<any> {
    const v = await this.prisma.vendorProfile.findUnique({ where: { userId: vendorUserId }, select: { id: true } });
    if (!v) throw new NotFoundException("Vendor not found.");
    return this.prisma.vendorProfile.update({ where: { id: v.id }, data: { bankAccountName: dto.bankAccountName, bankAccountNumber: dto.bankAccountNumber, bankIfscCode: dto.bankIfscCode } });
  }
}
