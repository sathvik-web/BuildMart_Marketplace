// ============================================================
// BuildMart — RfqService
// Core business logic for the RFQ pipeline.
// ============================================================

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Logger,
} from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { PrismaService } from "../database/database.module";
import { RfqSequenceService } from "./rfq-sequence.service";
import { CreateRfqDto } from "./dto/create-rfq.dto";
import { UpdateRfqDto } from "./dto/update-rfq.dto";
import { ListRfqsQueryDto } from "./dto/list-rfqs-query.dto";
import {
  RfqStatus,
  QuoteStatus,
  OrderStatus,
  UserRole,
  Prisma,
} from "@buildmart/database";

// RFQ state machine — allowed forward transitions only
const RFQ_TRANSITIONS: Record<RfqStatus, RfqStatus[]> = {
  [RfqStatus.DRAFT]: [RfqStatus.OPEN, RfqStatus.CANCELLED],
  [RfqStatus.OPEN]: [RfqStatus.QUOTED, RfqStatus.CANCELLED, RfqStatus.EXPIRED],
  [RfqStatus.QUOTED]: [RfqStatus.ACCEPTED, RfqStatus.CANCELLED, RfqStatus.EXPIRED],
  [RfqStatus.ACCEPTED]: [],
  [RfqStatus.CANCELLED]: [],
  [RfqStatus.EXPIRED]: [],
};

@Injectable()
export class RfqService {
  private readonly logger = new Logger(RfqService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sequence: RfqSequenceService,
    @InjectQueue("matching") private readonly matchingQueue: Queue,
    @InjectQueue("notifications") private readonly notificationQueue: Queue,
  ) {}

  // ── Create draft RFQ ─────────────────────────────────────
  async create(buyerId: string, dto: CreateRfqDto) {
    const refNum = await this.sequence.next("RFQ");

    // Validate all materialIds exist
    const materialIds = dto.items.map((i) => i.materialId);
    const materials = await this.prisma.material.findMany({
      where: { id: { in: materialIds }, isActive: true },
    });
    if (materials.length !== materialIds.length) {
      throw new BadRequestException("One or more material IDs are invalid.");
    }

    const rfq = await this.prisma.rfq.create({
      data: {
        referenceNumber: refNum,
        buyerId,
        title: dto.title,
        description: dto.description,
        status: RfqStatus.DRAFT,
        deliveryAddress: dto.deliveryAddress,
        deliveryCity: dto.deliveryCity ?? "Hyderabad",
        deliveryState: dto.deliveryState ?? "Telangana",
        deliveryPincode: dto.deliveryPincode,
        deliveryLat: new Prisma.Decimal(dto.deliveryLat),
        deliveryLng: new Prisma.Decimal(dto.deliveryLng),
        requireDelivery: dto.requireDelivery ?? true,
        expectedDeliveryDate: dto.expectedDeliveryDate
          ? new Date(dto.expectedDeliveryDate)
          : null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : this.defaultExpiry(),
        items: {
          create: dto.items.map((item, idx) => ({
            materialId: item.materialId,
            quantity: new Prisma.Decimal(item.quantity),
            unitOfMeasure: item.unitOfMeasure,
            specifications: item.specifications,
            sortOrder: idx,
          })),
        },
      },
      include: { items: { include: { material: true } } },
    });

    this.logger.log(`RFQ ${rfq.referenceNumber} created by buyer ${buyerId}`);
    return rfq;
  }

  // ── Publish RFQ → triggers matching engine ────────────────
  async publish(rfqId: string, buyerId: string) {
    const rfq = await this.findAndAuthorize(rfqId, buyerId);
    this.assertTransition(rfq.status, RfqStatus.OPEN);

    if (!rfq.items || rfq.items.length === 0) {
      throw new BadRequestException("RFQ must have at least one item before publishing.");
    }

    const published = await this.prisma.rfq.update({
      where: { id: rfqId },
      data: {
        status: RfqStatus.OPEN,
        publishedAt: new Date(),
      },
      include: { items: { include: { material: true } } },
    });

    // Enqueue geo-matching job — async, non-blocking
    await this.matchingQueue.add(
      "match-rfq",
      { rfqId, deliveryLat: Number(rfq.deliveryLat), deliveryLng: Number(rfq.deliveryLng) },
      { attempts: 3, backoff: { type: "exponential", delay: 2000 } },
    );

    this.logger.log(`RFQ ${rfq.referenceNumber} published — matching job enqueued`);
    return published;
  }

  // ── List RFQs ─────────────────────────────────────────────
  async list(userId: string, role: UserRole, query: ListRfqsQueryDto) {
    const { status, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    if (role === UserRole.BUYER) {
      // Buyers see their own RFQs
      const where: Prisma.RfqWhereInput = {
        buyerId: userId,
        ...(status ? { status } : {}),
      };
      const [rfqs, total] = await Promise.all([
        this.prisma.rfq.findMany({
          where,
          include: { items: { include: { material: true } }, _count: { select: { quotes: true } } },
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        }),
        this.prisma.rfq.count({ where }),
      ]);
      return { rfqs, total, page, limit };
    }

    if (role === UserRole.VENDOR) {
      // Vendors see open RFQs in their service area (basic version — full geo done in matching engine)
      const vendor = await this.prisma.vendorProfile.findUnique({
        where: { userId },
        include: { categories: true },
      });
      if (!vendor) throw new ForbiddenException("Vendor profile not found.");

      const vendorCategories = vendor.categories.map((c) => c.category);
      const where: Prisma.RfqWhereInput = {
        status: RfqStatus.OPEN,
        expiresAt: { gt: new Date() },
        items: {
          some: {
            material: { category: { in: vendorCategories } },
          },
        },
      };

      const [rfqs, total] = await Promise.all([
        this.prisma.rfq.findMany({
          where,
          include: {
            items: { include: { material: true } },
            buyer: { select: { name: true } },
            _count: { select: { quotes: true } },
          },
          orderBy: { publishedAt: "desc" },
          skip,
          take: limit,
        }),
        this.prisma.rfq.count({ where }),
      ]);
      return { rfqs, total, page, limit };
    }

    // Admin — all RFQs
    const [rfqs, total] = await Promise.all([
      this.prisma.rfq.findMany({
        where: status ? { status } : {},
        include: { buyer: { select: { name: true, phone: true } }, _count: { select: { quotes: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.rfq.count({ where: status ? { status } : {} }),
    ]);
    return { rfqs, total, page, limit };
  }

  // ── Get single RFQ ────────────────────────────────────────
  async findOne(rfqId: string, userId: string, role: UserRole) {
    const rfq = await this.prisma.rfq.findUnique({
      where: { id: rfqId },
      include: {
        buyer: { select: { id: true, name: true, phone: true } },
        items: { include: { material: true }, orderBy: { sortOrder: "asc" } },
        quotes: role === UserRole.BUYER
          ? {
              where: { status: { not: QuoteStatus.WITHDRAWN } },
              include: {
                vendorProfile: { select: { businessName: true, avgRating: true, totalOrders: true } },
                items: { include: { material: true } },
              },
              orderBy: { totalAmount: "asc" },
            }
          : role === UserRole.VENDOR
          ? { where: { vendorProfile: { userId } } }
          : true,
        order: true,
      },
    });

    if (!rfq) throw new NotFoundException("RFQ not found.");

    // Buyers can only see their own; vendors can see OPEN rfqs
    if (role === UserRole.BUYER && rfq.buyerId !== userId) {
      throw new ForbiddenException("You do not have access to this RFQ.");
    }

    return rfq;
  }

  // ── Update draft RFQ ──────────────────────────────────────
  async update(rfqId: string, buyerId: string, dto: UpdateRfqDto) {
    const rfq = await this.findAndAuthorize(rfqId, buyerId);
    if (rfq.status !== RfqStatus.DRAFT) {
      throw new BadRequestException("Only DRAFT RFQs can be edited.");
    }

    return this.prisma.rfq.update({
      where: { id: rfqId },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.deliveryAddress && { deliveryAddress: dto.deliveryAddress }),
        ...(dto.deliveryPincode && { deliveryPincode: dto.deliveryPincode }),
        ...(dto.deliveryLat && { deliveryLat: new Prisma.Decimal(dto.deliveryLat) }),
        ...(dto.deliveryLng && { deliveryLng: new Prisma.Decimal(dto.deliveryLng) }),
        ...(dto.expectedDeliveryDate && { expectedDeliveryDate: new Date(dto.expectedDeliveryDate) }),
        ...(dto.expiresAt && { expiresAt: new Date(dto.expiresAt) }),
        ...(dto.requireDelivery !== undefined && { requireDelivery: dto.requireDelivery }),
        ...(dto.items && {
          items: {
            deleteMany: {},
            create: dto.items.map((item, idx) => ({
              materialId: item.materialId,
              quantity: new Prisma.Decimal(item.quantity),
              unitOfMeasure: item.unitOfMeasure,
              specifications: item.specifications,
              sortOrder: idx,
            })),
          },
        }),
      },
      include: { items: { include: { material: true } } },
    });
  }

  // ── Cancel RFQ ────────────────────────────────────────────
  async cancel(rfqId: string, buyerId: string) {
    const rfq = await this.findAndAuthorize(rfqId, buyerId);
    this.assertTransition(rfq.status, RfqStatus.CANCELLED);

    return this.prisma.rfq.update({
      where: { id: rfqId },
      data: { status: RfqStatus.CANCELLED, closedAt: new Date() },
    });
  }

  // ── List quotes for an RFQ (sorted by price asc) ─────────
  async listQuotes(rfqId: string, buyerId: string) {
    await this.findAndAuthorize(rfqId, buyerId);

    return this.prisma.quote.findMany({
      where: {
        rfqId,
        status: { notIn: [QuoteStatus.WITHDRAWN, QuoteStatus.EXPIRED] },
      },
      include: {
        vendorProfile: {
          select: {
            businessName: true,
            avgRating: true,
            totalOrders: true,
            totalReviews: true,
            warehouseLat: true,
            warehouseLng: true,
          },
        },
        items: { include: { material: true } },
      },
      orderBy: { totalAmount: "asc" },
    });
  }

  // ── Accept quote → create Order ───────────────────────────
  async acceptQuote(rfqId: string, quoteId: string, buyerId: string) {
    const rfq = await this.findAndAuthorize(rfqId, buyerId);

    if (![RfqStatus.OPEN, RfqStatus.QUOTED].includes(rfq.status as any)) {
      throw new BadRequestException(`Cannot accept quote on an RFQ in ${rfq.status} status.`);
    }

    const quote = await this.prisma.quote.findUnique({
      where: { id: quoteId },
      include: { vendorProfile: true },
    });

    if (!quote || quote.rfqId !== rfqId) {
      throw new NotFoundException("Quote not found for this RFQ.");
    }
    if (quote.status !== QuoteStatus.PENDING) {
      throw new ConflictException(`Quote is already ${quote.status}.`);
    }
    if (quote.validUntil < new Date()) {
      throw new BadRequestException("This quote has expired. Request a new one.");
    }

    const orderRef = await this.sequence.next("ORDER");

    // Transactionally: accept quote, reject others, update RFQ, create order
    const [, , order] = await this.prisma.$transaction([
      // 1. Accept this quote
      this.prisma.quote.update({
        where: { id: quoteId },
        data: { status: QuoteStatus.ACCEPTED, acceptedAt: new Date() },
      }),
      // 2. Reject all other quotes for this RFQ
      this.prisma.quote.updateMany({
        where: { rfqId, id: { not: quoteId }, status: QuoteStatus.PENDING },
        data: { status: QuoteStatus.REJECTED, rejectedAt: new Date() },
      }),
      // 3. Create the Order
      this.prisma.order.create({
        data: {
          orderNumber: orderRef,
          rfqId,
          quoteId,
          vendorProfileId: quote.vendorProfileId,
          status: OrderStatus.PENDING,
          subtotalAmount: quote.subtotalAmount,
          gstAmount: quote.gstAmount,
          deliveryCharges: quote.deliveryCharges,
          totalAmount: quote.totalAmount,
          platformFeeRate: new Prisma.Decimal("0.02"),
          platformFeeAmount: quote.totalAmount.mul(new Prisma.Decimal("0.02")),
          vendorPayoutAmount: quote.totalAmount.mul(new Prisma.Decimal("0.98")),
          deliveryAddress: rfq.deliveryAddress,
          deliveryLat: rfq.deliveryLat,
          deliveryLng: rfq.deliveryLng,
          expectedDeliveryDate: rfq.expectedDeliveryDate,
          statusLogs: {
            create: {
              toStatus: OrderStatus.PENDING,
              changedById: buyerId,
              reason: "Order created after quote acceptance",
            },
          },
        },
      }),
      // 4. Update RFQ to ACCEPTED
      this.prisma.rfq.update({
        where: { id: rfqId },
        data: { status: RfqStatus.ACCEPTED, closedAt: new Date() },
      }),
    ]);

    // Notify vendor asynchronously
    await this.notificationQueue.add("order-created", {
      orderId: order.id,
      vendorUserId: quote.vendorProfile.userId,
    });

    this.logger.log(`Quote ${quoteId} accepted → Order ${order.orderNumber} created`);
    return order;
  }

  // ─────────────────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────────────────

  private async findAndAuthorize(rfqId: string, buyerId: string) {
    const rfq = await this.prisma.rfq.findUnique({
      where: { id: rfqId },
      include: { items: true },
    });
    if (!rfq) throw new NotFoundException("RFQ not found.");
    if (rfq.buyerId !== buyerId) throw new ForbiddenException("Not your RFQ.");
    return rfq;
  }

  private assertTransition(from: RfqStatus, to: RfqStatus) {
    const allowed = RFQ_TRANSITIONS[from];
    if (!allowed.includes(to)) {
      throw new BadRequestException(
        `Cannot transition RFQ from ${from} to ${to}.`,
      );
    }
  }

  private defaultExpiry(): Date {
    const d = new Date();
    d.setDate(d.getDate() + 7); // 7 days default
    return d;
  }
}
