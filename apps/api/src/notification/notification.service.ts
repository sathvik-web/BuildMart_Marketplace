import { Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { PrismaService } from "../database/database.module";
import { NotificationChannel, NotificationStatus } from "@buildmart/database";

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue("notification") private readonly queue: Queue,
  ) {}

  async sendWhatsApp(
    userId: string,
    to: string,
    templateName: string,
    templateParams: Record<string, string>,
    metadata?: Record<string, unknown>,
  ): Promise<any> {

    const notification = await this.prisma.notification.create({
      data: {
        userId,
        channel: NotificationChannel.WHATSAPP,
        status: NotificationStatus.QUEUED,
        title: templateName,
        body: JSON.stringify(templateParams),
        metadata: (metadata ?? {}) as any
      }
    });

    await this.queue.add("send-whatsapp", {
      notificationId: notification.id,
      userId,
      to,
      templateName,
      templateParams
    });

    return notification;
  }

  async sendApp(
    userId: string,
    title: string,
    body: string,
    metadata?: Record<string, unknown>,
  ): Promise<any> {

    const notification = await this.prisma.notification.create({
      data: {
        userId,
        channel: NotificationChannel.APP,
        status: NotificationStatus.QUEUED,
        title,
        body,
        metadata: (metadata ?? {}) as any
      }
    });

    await this.queue.add("send-app-notification", {
      notificationId: notification.id,
      userId,
      title,
      body,
      metadata
    });

    return notification;
  }

  async markDelivered(notificationId: string, externalId?: string): Promise<any> {
    return this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: NotificationStatus.DELIVERED,
        externalId,
        deliveredAt: new Date(),
        sentAt: new Date()
      }
    });
  }

  async markFailed(notificationId: string, reason: string): Promise<any> {
    return this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: NotificationStatus.FAILED,
        failureReason: reason
      }
    });
  }
}