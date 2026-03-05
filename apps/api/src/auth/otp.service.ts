// ============================================================
// BuildMart — OtpService
// Primary:  Firebase Phone Auth (client-side reCAPTCHA flow)
//           Server verifies the resulting ID token.
// Fallback: Twilio SMS OTP (6-digit, Redis TTL 10 min)
// ============================================================

import {
  Injectable,
  Logger,
  UnauthorizedException,
  InternalServerErrorException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FirebaseService } from "./firebase.service";
import { createHash, randomInt } from "crypto";

// We conditionally import ioredis at runtime — keeps the module testable without Redis
let Redis: typeof import("ioredis").default;

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly useTwilioFallback: boolean;
  private redis: InstanceType<typeof import("ioredis").default> | null = null;
  private twilioClient: import("twilio").Twilio | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly firebase: FirebaseService,
  ) {
    this.useTwilioFallback =
      !!config.get("TWILIO_ACCOUNT_SID") && !!config.get("TWILIO_AUTH_TOKEN");
  }

  async onModuleInit() {
    if (this.useTwilioFallback) {
      const IORedisCtor = (await import("ioredis")).default;
      this.redis = new IORedisCtor(this.config.getOrThrow("REDIS_URL"));

      const twilio = await import("twilio");
      this.twilioClient = twilio.default(
        this.config.get("TWILIO_ACCOUNT_SID")!,
        this.config.get("TWILIO_AUTH_TOKEN")!,
      );
      this.logger.log("Twilio fallback OTP enabled.");
    }
  }

  /**
   * In the Firebase flow the OTP is sent entirely client-side (web SDK /
   * React Native Firebase). The server only needs to expose this method for
   * the Twilio fallback path.
   */
  async sendOtp(phone: string): Promise<void> {
    if (!this.useTwilioFallback) {
      // Firebase flow: OTP is initiated by the client SDK — nothing to do here.
      this.logger.debug(`Firebase OTP flow — server send skipped for ${phone}`);
      return;
    }
    await this.sendTwilioOtp(phone);
  }

  /**
   * Verify an OTP token.
   * - If the token looks like a Firebase ID token (long JWT), verify via Firebase Admin.
   * - Otherwise treat it as a 6-digit Twilio OTP.
   */
  async verifyOtp(phone: string, token: string): Promise<string> {
    const isFirebaseToken = token.split(".").length === 3 && token.length > 100;

    if (isFirebaseToken) {
      return this.firebase.verifyIdToken(token);
    }

    if (this.useTwilioFallback) {
      return this.verifyTwilioOtp(phone, token);
    }

    throw new UnauthorizedException("OTP verification method not configured.");
  }

  // ─────────────────────────────────────────────────────────
  // Twilio fallback path
  // ─────────────────────────────────────────────────────────

  private async sendTwilioOtp(phone: string): Promise<void> {
    if (!this.twilioClient || !this.redis) {
      throw new InternalServerErrorException("Twilio not initialised.");
    }
    const otp = randomInt(100_000, 999_999).toString();
    const key = this.redisKey(phone);

    // Store hashed OTP — 10-minute TTL
    await this.redis.set(key, this.hashOtp(otp), "EX", 600);

    try {
      await this.twilioClient.messages.create({
        body: `Your BuildMart OTP is ${otp}. Valid for 10 minutes. Do not share.`,
        from: this.config.getOrThrow("TWILIO_FROM_NUMBER"),
        to: phone,
      });
      this.logger.log(`Twilio OTP sent to ${phone}`);
    } catch (err: any) {
      // Delete the stored OTP so a fresh one can be requested
      await this.redis.del(key);
      this.logger.error(`Twilio send failed: ${err.message}`);
      throw new InternalServerErrorException("Failed to send OTP. Try again.");
    }
  }

  private async verifyTwilioOtp(phone: string, otp: string): Promise<string> {
    if (!this.redis) throw new InternalServerErrorException("Redis not initialised.");
    const key = this.redisKey(phone);
    const stored = await this.redis.get(key);

    if (!stored || stored !== this.hashOtp(otp)) {
      throw new UnauthorizedException("Invalid or expired OTP.");
    }

    // One-time use — delete immediately after successful verification
    await this.redis.del(key);
    return phone;
  }

  private redisKey(phone: string): string {
    return `otp:${phone}`;
  }

  private hashOtp(otp: string): string {
    return createHash("sha256").update(otp).digest("hex");
  }
}
