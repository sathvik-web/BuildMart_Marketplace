import { Controller, Get, Param, Query, ParseUUIDPipe } from "@nestjs/common";
import { OrderService } from "./order.service";
import { CurrentUser } from "../auth/decorators";

@Controller({ path: "orders", version: "1" })
export class OrderController {
  constructor(private readonly os: OrderService) {}

  @Get()
  listOrders(@CurrentUser() u: any, @Query() q: any): Promise<any> {
    return this.os.listOrders(u.id, u.role, q.status);
  }

  @Get(":id")
  findOne(
    @CurrentUser() u: any,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<any> {
    return this.os.findOne(u.id, u.role, id);
  }
}