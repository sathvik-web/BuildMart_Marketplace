import { Module } from "@nestjs/common";
import { KycController } from "./kyc.controller";
import { KycService } from "./kyc.service";
import { NotificationModule } from "../notification/notification.module";
@Module({ imports: [NotificationModule], controllers: [KycController], providers: [KycService] })
export class KycModule {}
