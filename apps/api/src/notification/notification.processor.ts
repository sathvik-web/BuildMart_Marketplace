// BuildMart -- NotificationProcessor (BullMQ Worker)
// Handles all notification queue jobs.

import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { Logger } from "@nestjs/common";
import { PrismaService } from "../database/database.module";
import { WhatsAppService } from "./whatsapp.service";
import { NotificationLogService } from "./notification-log.service";
import { NotificationChannel, NotificationStatus } from "@buildmart/database";

@Processor("notifications")
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsAppService,
    private readonly notifLog: NotificationLogService,
  ) {
    super();
  }

  async process(job: Job) {
    switch (job.name) {
      case "whatsapp-rfq-alert":
        return this.handleRfqAlert(job.data);
      case "new-quote-received":
        return this.handleQuoteReceived(job.data);
      case "order-created":
        return this.handleOrderCreated(job.data);
      default:
        this.logger.warn("Unknown notification job: " + job.name);
    }
  }

  private async handleRfqAlert(data: any) {
    if (!data.whatsappNumber) {
      this.logger.debug("Vendor " + data.vendorProfileId + " has no WhatsApp number.");
      return;
    }

    const msgId = await this.whatsapp.sendRfqAlert({
      to: data.whatsappNumber,
      vendorName: data.vendorProfileId,
      rfqRef: data.rfqRef ?? "",
      rfqTitle: data.rfqTitle ?? "",
      deliveryCity: data.deliveryCity ?? "Hyderabad",
      distanceKm: data.distanceKm ?? 0,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
    });

    await this.notifLog.log({
      userId: data.userId,
      channel: NotificationChannel.WHATSAPP,
      title: "New RFQ: " + data.rfqRef,
      body: "A buyer posted an RFQ for " + data.rfqTitle + " near " + data.deliveryCity,
      metadata: { rfqId: data.rfqId },
      externalId: msgId,
      status: msgId ? NotificationStatus.SENT : NotificationStatus.FAILED,
      failureReason: msgId ? undefined : "WhatsApp API returned no message ID",
    });
  }

  private async handleQuoteReceived(data: any) {
    const buyer = await this.prisma.user.findUnique({
      where: { id: data.buyerUserId },
      select: { name: true, phone: true },
    });
    if (!buyer) return;

    const rfq = await this.prisma.rfq.findUnique({
      where: { id: data.rfqId },
      select: { referenceNumber: true },
    });

    const msgId = await this.whatsapp.sendQuoteNotification({
      to: buyer.phone,
      buyerName: buyer.name,
      rfqRef: rfq?.referenceNumber ?? "",
      vendorName: data.vendorName,
      totalAmount: data.totalAmount,
    });

    await this.notifLog.log({
      userId: data.buyerUserId,
      channel: NotificationChannel.WHATSAPP,
      title: "New quote received",
      body: data.vendorName + " submitted a quote for INR " + data.totalAmount,
      metadata: { rfqId: data.rfqId, quoteId: data.quoteId },
      externalId: msgId,
      status: msgId ? NotificationStatus.SENT : NotificationStatus.FAILED,
    });
  }

  private async handleOrderCreated(data: any) {
    const vendor = await this.prisma.vendorProfile.findUnique({
      where: { userId: data.vendorUserId },
      select: { businessName: true, whatsappNumber: true },
    });
    if (!vendor?.whatsappNumber) return;

    const order = await this.prisma.order.findUnique({
      where: { id: data.orderId },
      select: { orderNumber: true, totalAmount: true },
    });
    if (!order) return;

    const msgId = await this.whatsapp.sendOrderConfirmation({
      to: vendor.whatsappNumber,
      vendorName: vendor.businessName,
      orderNumber: order.orderNumber,
      totalAmount: order.totalAmount.toString(),
    });

    await this.notifLog.log({
      userId: data.vendorUserId,
      channel: NotificationChannel.WHATSAPP,
      title: "Order confirmed: " + order.orderNumber,
      body: "Your quote was accepted. Order " + order.orderNumber + " is now PENDING payment.",
      metadata: { orderId: data.orderId },
      externalId: msgId,
      status: msgId ? NotificationStatus.SENT : NotificationStatus.FAILED,
    });
  }
}