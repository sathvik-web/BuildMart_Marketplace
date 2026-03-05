import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { HttpModule } from "@nestjs/axios";

import { NotificationProcessor } from "./notification.processor";
import { WhatsAppService } from "./whatsapp.service";
import { NotificationLogService } from "./notification-log.service";
import { NotificationService } from "./notification.service";

@Module({
  imports: [
    BullModule.registerQueue({ name: "notification" }),
    HttpModule,
  ],
  providers: [
    NotificationService,
    NotificationProcessor,
    WhatsAppService,
    NotificationLogService,
  ],
  exports: [
    NotificationService,   // ⭐ REQUIRED
    WhatsAppService,
  ],
})
export class NotificationModule {}