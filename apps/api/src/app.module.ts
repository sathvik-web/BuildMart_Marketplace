import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { BullModule } from "@nestjs/bullmq";
import { APP_GUARD } from "@nestjs/core";

import { AuthModule } from "./auth/auth.module";
import { DatabaseModule } from "./database/database.module";
import { RfqModule } from "./rfq/rfq.module";
import { QuoteModule } from "./quote/quote.module";
import { MatchingModule } from "./matching/matching.module";
import { NotificationModule } from "./notification/notification.module";
import { PaymentModule } from "./payment/payment.module";
import { OrderModule } from "./order/order.module";
import { AdminModule } from "./admin/admin.module";
import { KycModule } from "./kyc/kyc.module";
import { MaterialModule } from "./material/material.module";
import { configValidationSchema } from "./config/config.schema";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: configValidationSchema,
      validationOptions: { allowUnknown: true, abortEarly: false },
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          { name: "global", ttl: config.get("THROTTLE_TTL_MS", 60_000), limit: config.get("THROTTLE_LIMIT", 60) },
          { name: "otp", ttl: 60_000, limit: 5 },
        ],
      }),
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: { url: config.getOrThrow<string>("REDIS_URL") },
        defaultJobOptions: { removeOnComplete: { count: 1000 }, removeOnFail: { count: 5000 } },
      }),
    }),
    DatabaseModule,
    AuthModule,
    RfqModule,
    QuoteModule,
    MatchingModule,
    NotificationModule,
    PaymentModule,
    OrderModule,
    AdminModule,
    KycModule,
    MaterialModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
