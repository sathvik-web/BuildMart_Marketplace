import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { QuoteController } from "./quote.controller";
import { QuoteService } from "./quote.service";

@Module({
  imports: [BullModule.registerQueue({ name: "notifications" })],
  controllers: [QuoteController],
  providers: [QuoteService],
  exports: [QuoteService],
})
export class QuoteModule {}
