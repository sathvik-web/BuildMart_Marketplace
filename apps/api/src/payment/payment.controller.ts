// payment.controller.ts
import { Controller, Post, Body, Param, ParseUUIDPipe, HttpCode, HttpStatus, Headers, Req } from "@nestjs/common";
import { PaymentService } from "./payment.service";
import { Roles, CurrentUser } from "../auth/decorators/index";
import { UserRole } from "@buildmart/database";
import { Public } from "../auth/decorators/index";

@Controller({ path: "payments", version: "1" })
export class PaymentController {
  constructor(private ps: PaymentService) {}

  /** Buyer: create Razorpay order for an order */
  @Post("orders/:orderId/initiate")
  @Roles(UserRole.BUYER)
  initiate(@CurrentUser() u: any, @Param("orderId", ParseUUIDPipe) orderId: string) {
    return this.ps.createPaymentOrder(u.id, orderId);
  }

  /** Razorpay webhook — public, verified by HMAC signature */
  @Public()
  @Post("webhook/razorpay")
  @HttpCode(HttpStatus.OK)
  async webhook(@Req() req: any, @Headers("x-razorpay-signature") sig: string) {
    const raw = JSON.stringify(req.body);
    return this.ps.handleWebhook(raw, sig);
  }

  /** Admin: manually release escrow after POD verification */
  @Post("orders/:orderId/release-escrow")
  @Roles(UserRole.ADMIN)
  releaseEscrow(@CurrentUser() u: any, @Param("orderId", ParseUUIDPipe) orderId: string) {
    return this.ps.releaseEscrow(orderId, u.id);
  }
}
