import { Module } from "@nestjs/common";
import { OrderController } from "./order.controller";
import { OrderService } from "./order.service";
import { NotificationModule } from "../notification/notification.module";
@Module({ imports: [NotificationModule], controllers: [OrderController], providers: [OrderService], exports: [OrderService] })
export class OrderModule {}
