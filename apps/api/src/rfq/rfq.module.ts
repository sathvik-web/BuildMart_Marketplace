// ============================================================
// BuildMart — RfqModule
// Covers: RFQ CRUD, geo-matching engine, vendor notification
// ============================================================

import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { RfqController } from "./rfq.controller";
import { RfqService } from "./rfq.service";
import { RfqSequenceService } from "./rfq-sequence.service";
import { MatchingModule } from "../matching/matching.module";
import { NotificationModule } from "../notification/notification.module";

@Module({
  imports: [
    BullModule.registerQueue(
      { name: "matching" },
      { name: "notifications" },
    ),
    MatchingModule,
    NotificationModule,
  ],
  controllers: [RfqController],
  providers: [RfqService, RfqSequenceService],
  exports: [RfqService],
})
export class RfqModule {}
