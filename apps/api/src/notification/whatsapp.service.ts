// BuildMart -- WhatsAppService
// Sends messages via Meta WhatsApp Business Cloud API.
// Uses pre-approved message templates for transactional messages.

import { Injectable, Logger } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { firstValueFrom } from "rxjs";

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly apiUrl: string;
  private readonly phoneNumberId: string;
  private readonly accessToken: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.apiUrl = config.get("WHATSAPP_API_URL", "https://graph.facebook.com/v19.0");
    this.phoneNumberId = config.get("WHATSAPP_PHONE_NUMBER_ID", "");
    this.accessToken = config.get("WHATSAPP_ACCESS_TOKEN", "");
  }

  // Template: rfq_new_lead
  // Parameters: vendor_name, rfq_ref, rfq_title, delivery_city, distance_km, expires_at
  async sendRfqAlert(params: {
    to: string;
    vendorName: string;
    rfqRef: string;
    rfqTitle: string;
    deliveryCity: string;
    distanceKm: number;
    expiresAt: Date | null;
  }): Promise<string | null> {
    return this.sendTemplate(params.to, "rfq_new_lead", "en", [
      { type: "text", text: params.vendorName },
      { type: "text", text: params.rfqRef },
      { type: "text", text: params.rfqTitle },
      { type: "text", text: params.deliveryCity },
      { type: "text", text: params.distanceKm.toFixed(1) + " km" },
      { type: "text", text: params.expiresAt ? params.expiresAt.toLocaleDateString("en-IN") : "7 days" },
    ]);
  }

  // Template: quote_received
  async sendQuoteNotification(params: {
    to: string;
    buyerName: string;
    rfqRef: string;
    vendorName: string;
    totalAmount: string;
  }): Promise<string | null> {
    return this.sendTemplate(params.to, "quote_received", "en", [
      { type: "text", text: params.buyerName },
      { type: "text", text: params.rfqRef },
      { type: "text", text: params.vendorName },
      { type: "text", text: "INR " + params.totalAmount },
    ]);
  }

  // Template: order_confirmed
  async sendOrderConfirmation(params: {
    to: string;
    vendorName: string;
    orderNumber: string;
    totalAmount: string;
  }): Promise<string | null> {
    return this.sendTemplate(params.to, "order_confirmed", "en", [
      { type: "text", text: params.vendorName },
      { type: "text", text: params.orderNumber },
      { type: "text", text: "INR " + params.totalAmount },
    ]);
  }

  private async sendTemplate(
    to: string,
    templateName: string,
    languageCode: string,
    components: any[],
  ): Promise<string | null> {
    if (!this.phoneNumberId || !this.accessToken) {
      this.logger.warn("WhatsApp not configured -- skipping send to " + to);
      return null;
    }

    try {
      const url = this.apiUrl + "/" + this.phoneNumberId + "/messages";
      const payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to.replace("+", ""),
        type: "template",
        template: {
          name: templateName,
          language: { code: languageCode },
          components: [{ type: "body", parameters: components }],
        },
      };

      const response = await firstValueFrom(
        this.http.post(url, payload, {
          headers: {
            Authorization: "Bearer " + this.accessToken,
            "Content-Type": "application/json",
          },
        }),
      );

      const messageId = response.data?.messages?.[0]?.id;
      this.logger.log("WhatsApp sent to " + to + " msgId=" + messageId);
      return messageId ?? null;
    } catch (err: any) {
      this.logger.error("WhatsApp send failed to " + to + ": " + err.message);
      return null;
    }
  }
}