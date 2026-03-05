// ============================================================
// BuildMart -- QuoteService
// Vendor submits price quotes against open RFQs.
// All arithmetic uses Prisma.Decimal -- no floating point.
// ============================================================

import {
  Injectable, NotFoundException, ForbiddenException,
  BadRequestException, ConflictException, Logger,
} from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { PrismaService } from "../database/database.module";
import { CreateQuoteDto } from "./dto/create-quote.dto";
import { UpdateQuoteDto } from "./dto/create-quote.dto";
import { RfqStatus, QuoteStatus, UserRole, Prisma } from "@buildmart/database";

@Injectable()
export class QuoteService {
  private readonly logger = new Logger(QuoteService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue("notifications") private readonly notificationQueue: Queue,
  ) {}

  async create(vendorUserId: string, dto: CreateQuoteDto) {
    const vendor = await this.prisma.vendorProfile.findUnique({ where: { userId: vendorUserId } });
    if (!vendor) throw new ForbiddenException("Vendor profile not found.");

    const rfq = await this.prisma.rfq.findUnique({
      where: { id: dto.rfqId },
      include: { buyer: { select: { id: true } } },
    });
    if (!rfq) throw new NotFoundException("RFQ not found.");
    if (rfq.status !== RfqStatus.OPEN) throw new BadRequestException("RFQ is not open for quotes.");
    if (rfq.expiresAt && rfq.expiresAt < new Date()) throw new BadRequestException("RFQ has expired.");

    const existing = await this.prisma.quote.findUnique({
      where: { rfqId_vendorProfileId: { rfqId: dto.rfqId, vendorProfileId: vendor.id } },
    });
    if (existing && existing.status !== QuoteStatus.WITHDRAWN) {
      throw new ConflictException("You already have an active quote for this RFQ.");
    }

    const items = dto.items.map((item) => {
      const qty = new Prisma.Decimal(item.quantity);
      const unitPrice = new Prisma.Decimal(item.unitPrice);
      return { ...item, qty, unitPrice, totalPrice: qty.mul(unitPrice) };
    });

    const subtotal = items.reduce((s, i) => s.add(i.totalPrice), new Prisma.Decimal(0));
    const gstPercent = new Prisma.Decimal(dto.gstPercent);
    const gstAmount = subtotal.mul(gstPercent).div(new Prisma.Decimal(100));
    const deliveryCharges = new Prisma.Decimal(dto.deliveryCharges ?? 0);
    const total = subtotal.add(gstAmount).add(deliveryCharges);

    const result = await this.prisma.$queryRaw`
      UPDATE sequence_counters SET next_value = next_value + 1
      WHERE name = 'QUOTE' RETURNING next_value
    `;
    const n = (result as any)[0]?.next_value ? (result as any)[0].next_value - 1 : 1;
    const refNum = "BM-QT-" + String(n).padStart(6, "0");

    const quote = await this.prisma.quote.create({
      data: {
        referenceNumber: refNum,
        rfqId: dto.rfqId,
        vendorProfileId: vendor.id,
        status: QuoteStatus.PENDING,
        subtotalAmount: subtotal,
        gstAmount,
        gstPercent,
        deliveryCharges,
        totalAmount: total,
        validUntil: new Date(dto.validUntil),
        deliveryDays: dto.deliveryDays,
        notes: dto.notes,
        termsConditions: dto.termsConditions,
        items: {
          create: items.map((item) => ({
            materialId: item.materialId,
            quantity: item.qty,
            unitOfMeasure: item.unitOfMeasure,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            brand: item.brand,
          })),
        },
      },
      include: { items: { include: { material: true } } },
    });

    await this.prisma.rfq.update({
      where: { id: dto.rfqId },
      data: { quotesReceived: { increment: 1 }, status: RfqStatus.QUOTED },
    });

    await this.notificationQueue.add("new-quote-received", {
      rfqId: dto.rfqId, quoteId: quote.id, buyerUserId: rfq.buyer.id,
      vendorName: vendor.businessName, totalAmount: total.toString(),
    });

    this.logger.log("Quote " + quote.referenceNumber + " submitted");
    return quote;
  }

  async listByVendor(vendorUserId: string) {
    const vendor = await this.prisma.vendorProfile.findUnique({ where: { userId: vendorUserId } });
    if (!vendor) throw new NotFoundException("Vendor profile not found.");
    return this.prisma.quote.findMany({
      where: { vendorProfileId: vendor.id },
      include: {
        rfq: { select: { referenceNumber: true, title: true, deliveryCity: true, status: true } },
        items: { include: { material: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(quoteId: string, userId: string, role: UserRole) {
    const quote = await this.prisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        rfq: { include: { buyer: { select: { id: true } } } },
        vendorProfile: { select: { userId: true, businessName: true } },
        items: { include: { material: true } },
      },
    });
    if (!quote) throw new NotFoundException("Quote not found.");
    const isBuyer = role === UserRole.BUYER && quote.rfq.buyer.id === userId;
    const isVendor = role === UserRole.VENDOR && quote.vendorProfile.userId === userId;
    if (!isBuyer && !isVendor && role !== UserRole.ADMIN) throw new ForbiddenException("Access denied.");
    return quote;
  }

  async withdraw(quoteId: string, vendorUserId: string) {
    const vendor = await this.prisma.vendorProfile.findUnique({ where: { userId: vendorUserId } });
    if (!vendor) throw new ForbiddenException("Vendor profile not found.");
    const quote = await this.prisma.quote.findUnique({ where: { id: quoteId } });
    if (!quote) throw new NotFoundException("Quote not found.");
    if (quote.vendorProfileId !== vendor.id) throw new ForbiddenException("Not your quote.");
    if (quote.status !== QuoteStatus.PENDING) throw new BadRequestException("Cannot withdraw.");
    await this.prisma.quote.update({ where: { id: quoteId }, data: { status: QuoteStatus.WITHDRAWN, withdrawnAt: new Date() } });
    await this.prisma.rfq.update({ where: { id: quote.rfqId }, data: { quotesReceived: { decrement: 1 } } });
    return { message: "Quote withdrawn." };
  }

  async update(quoteId: string, vendorUserId: string, dto: UpdateQuoteDto) {
    const vendor = await this.prisma.vendorProfile.findUnique({ where: { userId: vendorUserId } });
    if (!vendor) throw new ForbiddenException("Vendor profile not found.");
    const quote = await this.prisma.quote.findUnique({ where: { id: quoteId } });
    if (!quote) throw new NotFoundException("Quote not found.");
    if (quote.vendorProfileId !== vendor.id) throw new ForbiddenException("Not your quote.");
    if (quote.status !== QuoteStatus.PENDING) throw new BadRequestException("Only PENDING quotes can be updated.");
    return this.prisma.quote.update({
      where: { id: quoteId },
      data: {
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.validUntil && { validUntil: new Date(dto.validUntil) }),
        ...(dto.deliveryDays && { deliveryDays: dto.deliveryDays }),
      },
    });
  }
}
