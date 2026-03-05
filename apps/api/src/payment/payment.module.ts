import { Module } from "@nestjs/common";
import { PaymentController } from "./payment.controller";
import { PaymentService } from "./payment.service";
import { NotificationModule } from "../notification/notification.module";
@Module({ imports: [NotificationModule], controllers: [PaymentController], providers: [PaymentService], exports: [PaymentService] })
export class PaymentModule {}
