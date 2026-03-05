import { Injectable, NotFoundException, BadRequestException, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../database/database.module";
import { NotificationService } from "../notification/notification.service";
import { Prisma, OrderStatus, PaymentStatus } from "@buildmart/database";
import { createHmac } from "crypto";
import Razorpay from "razorpay";

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private rp: Razorpay;
  private webhookSecret: string;

  constructor(private prisma: PrismaService, private notif: NotificationService, config: ConfigService) {
    this.rp = new Razorpay({ key_id: config.getOrThrow("RAZORPAY_KEY_ID"), key_secret: config.getOrThrow("RAZORPAY_KEY_SECRET") });
    this.webhookSecret = config.getOrThrow("RAZORPAY_WEBHOOK_SECRET");
  }

  /** Buyer initiates payment — creates Razorpay order */
  async createPaymentOrder(buyerId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: { rfq: { select: { buyerId: true } } } });
    if (!order) throw new NotFoundException("Order not found.");
    if (order.rfq.buyerId !== buyerId) throw new BadRequestException("Access denied.");
    if (order.status !== OrderStatus.PENDING) throw new BadRequestException(`Order status is '${order.status}', expected PENDING.`);

    // Amount in paise (₹ × 100) — stored as Decimal, multiply precisely
    const amountPaise = order.totalAmount.mul(100).toFixed(0);

    const rpOrder = await this.rp.orders.create({
      amount: parseInt(amountPaise),
      currency: "INR",
      receipt: order.orderNumber,
      notes: { orderId: order.id, orderNumber: order.orderNumber },
    });

    // Persist Razorpay order ID and create Payment row
    await this.prisma.$transaction([
      this.prisma.order.update({ where: { id: orderId }, data: { razorpayOrderId: rpOrder.id } }),
      this.prisma.payment.create({ data: { orderId, razorpayOrderId: rpOrder.id, status: PaymentStatus.CREATED, amount: order.totalAmount, currency: "INR" } }),
    ]);

    return { razorpayOrderId: rpOrder.id, amount: parseInt(amountPaise), currency: "INR", orderNumber: order.orderNumber };
  }

  /** Razorpay webhook handler — payment.captured / payment.failed */
  async handleWebhook(rawBody: string, signature: string) {
    // Verify HMAC-SHA256 signature
    const expected = createHmac("sha256", this.webhookSecret).update(rawBody).digest("hex");
    if (expected !== signature) { this.logger.warn("Invalid Razorpay webhook signature"); throw new BadRequestException("Invalid signature."); }

    const event = JSON.parse(rawBody);
    this.logger.log(`Razorpay webhook: ${event.event}`);

    if (event.event === "payment.captured") await this.handleCaptured(event.payload.payment.entity);
    if (event.event === "payment.failed") await this.handleFailed(event.payload.payment.entity);
    if (event.event === "refund.processed") await this.handleRefund(event.payload.refund.entity);

    return { received: true };
  }

  private async handleCaptured(payment: any) {
    const pay = await this.prisma.payment.findUnique({ where: { razorpayOrderId: payment.order_id } });
    if (!pay) return;

    await this.prisma.$transaction([
      this.prisma.payment.update({ where: { id: pay.id }, data: { razorpayPaymentId: payment.id, razorpaySignature: payment.id, status: PaymentStatus.CAPTURED, method: payment.method, bank: payment.bank, vpa: payment.vpa, capturedAt: new Date(), webhookPayload: payment } }),
      this.prisma.order.update({ where: { id: pay.orderId }, data: { status: OrderStatus.PAID, razorpayPaymentId: payment.id } }),
      this.prisma.orderStatusLog.create({ data: { orderId: pay.orderId, fromStatus: OrderStatus.PENDING, toStatus: OrderStatus.PAID, reason: `Payment captured: ${payment.id}` } }),
    ]);

    // Notify vendor to prepare dispatch
    const order = await this.prisma.order.findUnique({ where: { id: pay.orderId }, include: { vendorProfile: { include: { user: true } } } });
    if (order) {
      await this.notif.sendApp(order.vendorProfile.userId, "Payment received — prepare dispatch", `Order ${order.orderNumber} has been paid. Please prepare for dispatch.`, { orderId: order.id });
    }
    this.logger.log(`Payment captured for order ${pay.orderId}`);
  }

  private async handleFailed(payment: any) {
    const pay = await this.prisma.payment.findUnique({ where: { razorpayOrderId: payment.order_id } });
    if (!pay) return;
    await this.prisma.payment.update({ where: { id: pay.id }, data: { status: PaymentStatus.FAILED, failureCode: payment.error_code, failureDescription: payment.error_description, webhookPayload: payment } });
    this.logger.warn(`Payment failed for order ${pay.orderId}: ${payment.error_description}`);
  }

  private async handleRefund(refund: any) {
    const pay = await this.prisma.payment.findFirst({ where: { razorpayPaymentId: refund.payment_id } });
    if (!pay) return;
    await this.prisma.$transaction([
      this.prisma.payment.update({ where: { id: pay.id }, data: { status: PaymentStatus.REFUNDED, refundId: refund.id, refundAmount: new Prisma.Decimal(refund.amount).div(100), refundedAt: new Date() } }),
      this.prisma.order.update({ where: { id: pay.orderId }, data: { status: OrderStatus.REFUNDED } }),
      this.prisma.orderStatusLog.create({ data: { orderId: pay.orderId, fromStatus: OrderStatus.CANCELLED, toStatus: OrderStatus.REFUNDED, reason: `Refund processed: ${refund.id}` } }),
    ]);
  }

  /** Release escrow to vendor after POD verified */
  async releaseEscrow(orderId: string, adminId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: { vendorProfile: true, payment: true } });
    if (!order) throw new NotFoundException("Order not found.");
    if (order.status !== OrderStatus.DELIVERED) throw new BadRequestException("Order must be DELIVERED before releasing escrow.");

    // Razorpay Route payout to vendor fund account
    if (order.vendorProfile.razorpayFundAccountId) {
      const payout = await (this.rp as any).payouts.create({
        account_number: process.env.RAZORPAY_ACCOUNT_NUMBER,
        fund_account_id: order.vendorProfile.razorpayFundAccountId,
        amount: order.vendorPayoutAmount.mul(100).toFixed(0),
        currency: "INR",
        mode: "IMPS",
        purpose: "payout",
        narration: `BuildMart payout ${order.orderNumber}`,
      });

      await this.prisma.$transaction([
        this.prisma.order.update({ where: { id: orderId }, data: { status: OrderStatus.COMPLETED, razorpayPayoutId: payout.id, escrowReleaseAt: new Date() } }),
        this.prisma.orderStatusLog.create({ data: { orderId, fromStatus: OrderStatus.DELIVERED, toStatus: OrderStatus.COMPLETED, changedById: adminId, reason: `Escrow released. Payout: ${payout.id}` } }),
      ]);

      await this.notif.sendWhatsApp(order.vendorProfile.userId, order.vendorProfile.whatsappNumber!, "payment_released", { vendor_name: order.vendorProfile.businessName, order_number: order.orderNumber, payout_amount: `₹${order.vendorPayoutAmount.toFixed(2)}` }, { orderId });
    }

    return { message: "Escrow released to vendor." };
  }
}
