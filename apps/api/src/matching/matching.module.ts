// ============================================================
// BuildMart — MatchingModule
// BullMQ processor that runs the 50 km geo-fence vendor query
// and enqueues WhatsApp/app notifications for matched vendors.
// ============================================================

import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { MatchingProcessor } from "./matching.processor";
import { MatchingService } from "./matching.service";
import { NotificationModule } from "../notification/notification.module";

@Module({
  imports: [
    BullModule.registerQueue(
      { name: "matching" },
      { name: "notifications" },
    ),
    NotificationModule,
  ],
  providers: [MatchingProcessor, MatchingService],
  exports: [MatchingService],
})
export class MatchingModule {}
