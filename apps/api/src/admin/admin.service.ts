import { Injectable, NotFoundException, BadRequestException, Logger } from "@nestjs/common";
import { PrismaService } from "../database/database.module";
import { NotificationService } from "../notification/notification.service";
import { VendorKycStatus, OrderStatus } from "@buildmart/database";

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);
  constructor(private prisma: PrismaService, private notif: NotificationService) {}

  // ── KYC Review ────────────────────────────────────────────
  async listPendingKyc(): Promise<any> {
    return this.prisma.vendorProfile.findMany({ where: { kycStatus: { in: [VendorKycStatus.SUBMITTED] } }, include: { user: { select: { name: true, phone: true, email: true } }, kycDocuments: true }, orderBy: { createdAt: "asc" } });
  }

  async approveKyc(adminId: string, vendorProfileId: string) {
    const v = await this.prisma.vendorProfile.findUnique({ where: { id: vendorProfileId }, include: { user: true } });
    if (!v) throw new NotFoundException("Vendor not found.");
    if (v.kycStatus !== VendorKycStatus.SUBMITTED) throw new BadRequestException("KYC not in SUBMITTED state.");

    await this.prisma.$transaction([
      this.prisma.vendorProfile.update({ where: { id: vendorProfileId }, data: { kycStatus: VendorKycStatus.APPROVED, kycReviewedAt: new Date(), kycReviewedBy: adminId } }),
      this.prisma.adminAuditLog.create({ data: { adminId, action: "APPROVE_VENDOR_KYC", targetType: "VendorProfile", targetId: vendorProfileId, after: { kycStatus: VendorKycStatus.APPROVED } } }),
    ]);

    await this.notif.sendWhatsApp(v.userId, v.whatsappNumber ?? v.user.phone, "kyc_approved", { vendor_name: v.businessName }, { vendorProfileId });
    return { message: `KYC approved for ${v.businessName}.` };
  }

  async rejectKyc(adminId: string, vendorProfileId: string, reason: string) {
    const v = await this.prisma.vendorProfile.findUnique({ where: { id: vendorProfileId }, include: { user: true } });
    if (!v) throw new NotFoundException("Vendor not found.");

    await this.prisma.$transaction([
      this.prisma.vendorProfile.update({ where: { id: vendorProfileId }, data: { kycStatus: VendorKycStatus.REJECTED, kycRejectionNote: reason, kycReviewedAt: new Date(), kycReviewedBy: adminId } }),
      this.prisma.adminAuditLog.create({ data: { adminId, action: "REJECT_VENDOR_KYC", targetType: "VendorProfile", targetId: vendorProfileId, after: { kycStatus: VendorKycStatus.REJECTED, reason } } }),
    ]);

    await this.notif.sendWhatsApp(v.userId, v.whatsappNumber ?? v.user.phone, "kyc_rejected", { vendor_name: v.businessName, rejection_reason: reason }, { vendorProfileId });
    return { message: "KYC rejected." };
  }

  // ── Dispute Resolution ────────────────────────────────────
  async listDisputes(): Promise<any> {
    return this.prisma.order.findMany({ where: { status: OrderStatus.DISPUTED }, include: { rfq: { select: { title: true, referenceNumber: true, buyerId: true } }, vendorProfile: { select: { businessName: true } }, payment: true, deliveries: true }, orderBy: { disputeRaisedAt: "asc" } });
  }

  async resolveDispute(adminId: string, orderId: string, action: "refund" | "release", reason: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.status !== OrderStatus.DISPUTED) throw new BadRequestException("Order not in disputed state.");
    const newStatus = action === "refund" ? OrderStatus.REFUNDED : OrderStatus.COMPLETED;
    await this.prisma.$transaction([
      this.prisma.order.update({ where: { id: orderId }, data: { status: newStatus, disputeResolvedAt: new Date() } }),
      this.prisma.orderStatusLog.create({ data: { orderId, fromStatus: OrderStatus.DISPUTED, toStatus: newStatus, changedById: adminId, reason } }),
      this.prisma.adminAuditLog.create({ data: { adminId, action: "RESOLVE_DISPUTE", targetType: "Order", targetId: orderId, after: { action, reason } } }),
    ]);
    return { message: `Dispute resolved — order ${action === "refund" ? "refunded" : "completed"}.` };
  }

  // ── Analytics ─────────────────────────────────────────────
  async getDashboardStats(): Promise<any> {
    const [totalUsers, totalVendors, totalRfqs, totalOrders, pendingKyc, openDisputes, revenueAgg] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.vendorProfile.count({ where: { kycStatus: VendorKycStatus.APPROVED } }),
      this.prisma.rfq.count(),
      this.prisma.order.count(),
      this.prisma.vendorProfile.count({ where: { kycStatus: VendorKycStatus.SUBMITTED } }),
      this.prisma.order.count({ where: { status: OrderStatus.DISPUTED } }),
      this.prisma.payment.aggregate({ where: { status: "CAPTURED" }, _sum: { amount: true } }),
    ]);

    const topMaterials = await this.prisma.rfqItem.groupBy({ by: ["materialId"], _count: { materialId: true }, orderBy: { _count: { materialId: "desc" } }, take: 5 });
    const materialIds = topMaterials.map(m => m.materialId);
    const materials = await this.prisma.material.findMany({ where: { id: { in: materialIds } }, select: { id: true, name: true, category: true } });
    const topMaterialsWithNames = topMaterials.map(t => ({ ...t, material: materials.find(m => m.id === t.materialId) }));

    return { totalUsers, totalVendors, totalRfqs, totalOrders, pendingKyc, openDisputes, totalRevenue: revenueAgg._sum.amount ?? 0, topMaterials: topMaterialsWithNames };
  }

  async suspendUser(adminId: string, userId: string, reason: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found.");
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { status: "SUSPENDED" } }),
      this.prisma.session.deleteMany({ where: { userId } }),
      this.prisma.adminAuditLog.create({ data: { adminId, action: "SUSPEND_USER", targetType: "User", targetId: userId, after: { reason } } }),
    ]);
    return { message: "User suspended and all sessions revoked." };
  }
}
