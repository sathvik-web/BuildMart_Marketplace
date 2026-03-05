// ============================================================
// BuildMart — MatchingProcessor (BullMQ Worker)
// Consumes "matching" queue jobs.
// Job: match-rfq -> find vendors -> enqueue WhatsApp notifications
// ============================================================

import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { PrismaService } from "../database/database.module";
import { MatchingService } from "./matching.service";

interface MatchRfqJob {
  rfqId: string;
  deliveryLat: number;
  deliveryLng: number;
}

@Processor("matching")
export class MatchingProcessor extends WorkerHost {
  private readonly logger = new Logger(MatchingProcessor.name);

  constructor(
    private readonly matchingService: MatchingService,
    private readonly prisma: PrismaService,
    @InjectQueue("notifications") private readonly notificationQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<MatchRfqJob>) {
    const { rfqId, deliveryLat, deliveryLng } = job.data;
    this.logger.log("Processing matching job for RFQ " + rfqId);

    const categories = await this.matchingService.getRfqCategories(rfqId);
    if (!categories.length) {
      this.logger.warn("RFQ " + rfqId + " has no categories — skipping matching.");
      return;
    }

    const vendors = await this.matchingService.findMatchingVendors(
      deliveryLat,
      deliveryLng,
      categories,
    );

    if (!vendors.length) {
      this.logger.warn("No vendors matched for RFQ " + rfqId);
      await this.prisma.rfq.update({ where: { id: rfqId }, data: { vendorsNotified: 0 } });
      return;
    }

    const rfq = await this.prisma.rfq.findUnique({
      where: { id: rfqId },
      select: { referenceNumber: true, title: true, deliveryCity: true, expiresAt: true },
    });

    const notificationJobs = vendors.map((vendor, idx) => ({
      name: "whatsapp-rfq-alert",
      data: {
        userId: vendor.userId,
        vendorProfileId: vendor.vendorProfileId,
        whatsappNumber: vendor.whatsappNumber,
        rfqId,
        rfqRef: rfq?.referenceNumber,
        rfqTitle: rfq?.title,
        deliveryCity: rfq?.deliveryCity,
        expiresAt: rfq?.expiresAt,
        distanceKm: vendor.distanceKm,
      },
      opts: {
        attempts: 3,
        backoff: { type: "exponential" as const, delay: 3000 },
        delay: idx * 200,
      },
    }));

    await this.notificationQueue.addBulk(notificationJobs);
    await this.prisma.rfq.update({ where: { id: rfqId }, data: { vendorsNotified: vendors.length } });

    this.logger.log("RFQ " + rfqId + ": " + vendors.length + " vendor notifications enqueued.");
  }
}
