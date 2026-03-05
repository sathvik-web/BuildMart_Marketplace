import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from "@nestjs/common";
import { PrismaService } from "../database/database.module";
import { NotificationService } from "../notification/notification.service";
import { Prisma, OrderStatus, UserRole } from "@buildmart/database";
import { IsString, IsNumber, IsOptional, IsArray } from "class-validator";

// ── DTOs ──────────────────────────────────────────────────
export class DispatchOrderDto {
  @IsString() vehicleNumber: string;
  @IsString() driverName: string;
  @IsString() driverPhone: string;
  @IsString() @IsOptional() eChallanUrl?: string;
  @IsString() @IsOptional() eChallanKey?: string;
  @IsString() @IsOptional() notes?: string;
}

export class SubmitPodDto {
  @IsArray() podPhotoUrls: string[];
  @IsArray() podPhotoKeys: string[];
  @IsNumber() podLat: number;
  @IsNumber() podLng: number;
  @IsNumber() @IsOptional() podAccuracyM?: number;
  @IsString() @IsOptional() eChallanUrl?: string;
  @IsString() @IsOptional() eChallanKey?: string;
  @IsString() @IsOptional() notes?: string;
}

export class RaiseDisputeDto {
  @IsString() reason: string;
}

export class LeaveReviewDto {
  @IsNumber() rating: number;
  @IsString() @IsOptional() comment?: string;
  @IsNumber() @IsOptional() qualityRating?: number;
  @IsNumber() @IsOptional() deliveryRating?: number;
  @IsNumber() @IsOptional() communicationRating?: number;
}

// ─────────────────────────────────────────────────────────

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);
  constructor(private prisma: PrismaService, private notif: NotificationService) {}

  /** GET order — scoped by role */
  async findOne(userId: string, role: UserRole, orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: { rfq: { select: { buyerId: true, title: true, referenceNumber: true } }, quote: { select: { referenceNumber: true, gstPercent: true } }, vendorProfile: { select: { userId: true, businessName: true, avgRating: true } }, payment: true, statusLogs: { orderBy: { occurredAt: "desc" } }, deliveries: true, review: true } });
    if (!order) throw new NotFoundException("Order not found.");
    if (role === UserRole.BUYER && order.rfq.buyerId !== userId) throw new ForbiddenException("Access denied.");
    if (role === UserRole.VENDOR && order.vendorProfile.userId !== userId) throw new ForbiddenException("Access denied.");
    return order;
  }

  /** List orders for buyer or vendor */
  async listOrders(userId: string, role: UserRole, status?: OrderStatus) {
    if (role === UserRole.BUYER) {
      const rfqs = await this.prisma.rfq.findMany({ where: { buyerId: userId }, select: { id: true } });
      const rfqIds = rfqs.map(r => r.id);
      return this.prisma.order.findMany({ where: { rfqId: { in: rfqIds }, ...(status ? { status } : {}) }, include: { rfq: { select: { title: true, referenceNumber: true } }, vendorProfile: { select: { businessName: true } }, payment: { select: { status: true } } }, orderBy: { createdAt: "desc" } });
    }
    const vendor = await this.prisma.vendorProfile.findUnique({ where: { userId }, select: { id: true } });
    if (!vendor) throw new NotFoundException("Vendor not found.");
    return this.prisma.order.findMany({ where: { vendorProfileId: vendor.id, ...(status ? { status } : {}) }, include: { rfq: { select: { title: true, referenceNumber: true } }, payment: { select: { status: true } } }, orderBy: { createdAt: "desc" } });
  }

  /** Vendor: mark dispatched + record delivery event */
  async dispatch(vendorUserId: string, orderId: string, dto: DispatchOrderDto) {
    const order = await this.assertVendorOwns(vendorUserId, orderId);
    if (order.status !== OrderStatus.PAID) throw new BadRequestException("Order must be PAID before dispatch.");

    await this.prisma.$transaction([
      this.prisma.order.update({ where: { id: orderId }, data: { status: OrderStatus.DISPATCHED } }),
      this.prisma.orderStatusLog.create({ data: { orderId, fromStatus: OrderStatus.PAID, toStatus: OrderStatus.DISPATCHED, changedById: order.vendorProfile.userId, reason: `Dispatched via vehicle ${dto.vehicleNumber}` } }),
      this.prisma.deliveryEvent.create({ data: { orderId, vehicleNumber: dto.vehicleNumber, driverName: dto.driverName, driverPhone: dto.driverPhone, eChallanUrl: dto.eChallanUrl, eChallanKey: dto.eChallanKey, notes: dto.notes, dispatchedAt: new Date() } }),
    ]);

    // Notify buyer
    await this.notif.sendApp(order.rfq.buyerId, "Your order is on the way!", `Order ${order.orderNumber} dispatched via vehicle ${dto.vehicleNumber}. Driver: ${dto.driverName} (${dto.driverPhone})`, { orderId });
    return { message: "Order dispatched." };
  }

  /** Vendor: submit POD (GPS + e-challan + photos) */
  async submitPod(vendorUserId: string, orderId: string, dto: SubmitPodDto) {
    const order = await this.assertVendorOwns(vendorUserId, orderId);
    if (order.status !== OrderStatus.DISPATCHED) throw new BadRequestException("Order must be DISPATCHED.");

    if (!dto.podPhotoUrls?.length) throw new BadRequestException("At least one POD photo required.");
    if (!dto.podLat || !dto.podLng) throw new BadRequestException("GPS coordinates required for POD.");

    const delivery = await this.prisma.deliveryEvent.findFirst({ where: { orderId }, orderBy: { dispatchedAt: "desc" } });
    if (!delivery) throw new NotFoundException("Dispatch event not found.");

    await this.prisma.$transaction([
      this.prisma.deliveryEvent.update({ where: { id: delivery.id }, data: { podPhotoUrls: dto.podPhotoUrls, podPhotoKeys: dto.podPhotoKeys, podLat: new Prisma.Decimal(dto.podLat), podLng: new Prisma.Decimal(dto.podLng), podAccuracyM: dto.podAccuracyM ? new Prisma.Decimal(dto.podAccuracyM) : null, eChallanUrl: dto.eChallanUrl ?? delivery.eChallanUrl, eChallanKey: dto.eChallanKey ?? delivery.eChallanKey, deliveredAt: new Date(), podSubmittedAt: new Date(), notes: dto.notes } }),
      this.prisma.order.update({ where: { id: orderId }, data: { status: OrderStatus.DELIVERED, actualDeliveryDate: new Date() } }),
      this.prisma.orderStatusLog.create({ data: { orderId, fromStatus: OrderStatus.DISPATCHED, toStatus: OrderStatus.DELIVERED, changedById: order.vendorProfile.userId, reason: "POD submitted by vendor" } }),
    ]);

    // Notify buyer to confirm delivery + admin to verify POD
    await this.notif.sendApp(order.rfq.buyerId, "Delivery completed — please confirm", `Order ${order.orderNumber} has been marked delivered. Click to confirm and release payment.`, { orderId });
    return { message: "POD submitted. Awaiting buyer confirmation." };
  }

  /** Buyer: confirm delivery received */
  async confirmDelivery(buyerUserId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: { rfq: { select: { buyerId: true } }, vendorProfile: true } });
    if (!order) throw new NotFoundException("Order not found.");
    if (order.rfq.buyerId !== buyerUserId) throw new ForbiddenException("Access denied.");
    if (order.status !== OrderStatus.DELIVERED) throw new BadRequestException("Order must be DELIVERED status.");

    // Admin will release escrow via PaymentService.releaseEscrow
    await this.notif.sendApp(order.vendorProfile.userId, "Buyer confirmed delivery", `Buyer confirmed receipt of order ${order.orderNumber}. Payment will be released after verification.`, { orderId });
    return { message: "Delivery confirmed. Escrow release initiated." };
  }

  /** Buyer or Vendor: raise dispute */
  async raiseDispute(userId: string, orderId: string, dto: RaiseDisputeDto) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: { rfq: { select: { buyerId: true } }, vendorProfile: true } });
    if (!order) throw new NotFoundException("Order not found.");
    const isBuyer = order.rfq.buyerId === userId;
    const isVendor = order.vendorProfile.userId === userId;
    if (!isBuyer && !isVendor) throw new ForbiddenException("Access denied.");
    if (![OrderStatus.DELIVERED, OrderStatus.DISPATCHED, OrderStatus.PAID].includes(order.status as any)) throw new BadRequestException("Dispute cannot be raised at this stage.");

    await this.prisma.$transaction([
      this.prisma.order.update({ where: { id: orderId }, data: { status: OrderStatus.DISPUTED, disputeRaisedAt: new Date(), disputeRaisedBy: userId, disputeNote: dto.reason } }),
      this.prisma.orderStatusLog.create({ data: { orderId, fromStatus: order.status, toStatus: OrderStatus.DISPUTED, changedById: userId, reason: dto.reason } }),
    ]);
    return { message: "Dispute raised. Admin will review within 24 hours." };
  }

  /** Buyer: leave review for vendor after order completed */
  async leaveReview(buyerUserId: string, orderId: string, dto: LeaveReviewDto) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: { rfq: { select: { buyerId: true } }, vendorProfile: true } });
    if (!order) throw new NotFoundException("Order not found.");
    if (order.rfq.buyerId !== buyerUserId) throw new ForbiddenException("Access denied.");
    if (order.status !== OrderStatus.COMPLETED) throw new BadRequestException("Can only review completed orders.");
    if (dto.rating < 1 || dto.rating > 5) throw new BadRequestException("Rating must be 1–5.");

    const review = await this.prisma.vendorReview.create({ data: { orderId, vendorProfileId: order.vendorProfileId, reviewerId: buyerUserId, rating: dto.rating, comment: dto.comment, qualityRating: dto.qualityRating, deliveryRating: dto.deliveryRating, communicationRating: dto.communicationRating } });

    // Update vendor avg rating
    const agg = await this.prisma.vendorReview.aggregate({ where: { vendorProfileId: order.vendorProfileId }, _avg: { rating: true }, _count: true });
    await this.prisma.vendorProfile.update({ where: { id: order.vendorProfileId }, data: { avgRating: new Prisma.Decimal(agg._avg.rating ?? 0), totalReviews: agg._count } });

    return review;
  }

  private async assertVendorOwns(userId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: { rfq: { select: { buyerId: true } }, vendorProfile: true } });
    if (!order) throw new NotFoundException("Order not found.");
    if (order.vendorProfile.userId !== userId) throw new ForbiddenException("Access denied.");
    return order;
  }
}
