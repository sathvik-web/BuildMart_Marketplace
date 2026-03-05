import { Module } from "@nestjs/common";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { NotificationModule } from "../notification/notification.module";
import { PaymentModule } from "../payment/payment.module";
@Module({ imports: [NotificationModule, PaymentModule], controllers: [AdminController], providers: [AdminService] })
export class AdminModule {}
