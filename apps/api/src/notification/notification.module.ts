import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { HttpModule } from "@nestjs/axios";
import { NotificationProcessor } from "./notification.processor";
import { WhatsAppService } from "./whatsapp.service";
import { NotificationLogService } from "./notification-log.service";

@Module({
  imports: [BullModule.registerQueue({ name: "notifications" }), HttpModule],
  providers: [NotificationProcessor, WhatsAppService, NotificationLogService],
  exports: [WhatsAppService],
})
export class NotificationModule {}