// ============================================================
// BuildMart — FirebaseService
// Wraps Firebase Admin SDK for phone OTP ID-token verification.
// ============================================================

import { Injectable, OnModuleInit, Logger, InternalServerErrorException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as admin from "firebase-admin";

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private app: admin.app.App;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    if (admin.apps.length === 0) {
      this.app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: this.config.getOrThrow("FIREBASE_PROJECT_ID"),
          // Env stores the private key with literal \n — replace back to newlines
          privateKey: this.config
            .getOrThrow<string>("FIREBASE_PRIVATE_KEY")
            .replace(/\\n/g, "\n"),
          clientEmail: this.config.getOrThrow("FIREBASE_CLIENT_EMAIL"),
        }),
      });
    } else {
      this.app = admin.apps[0]!;
    }
    this.logger.log("Firebase Admin SDK initialized.");
  }

  /**
   * Verifies a Firebase phone-auth ID token returned by the client SDK.
   * Returns the verified E.164 phone number, or throws.
   */
  async verifyIdToken(idToken: string): Promise<string> {
    try {
      const decoded = await this.app.auth().verifyIdToken(idToken, true);
      if (!decoded.phone_number) {
        throw new InternalServerErrorException(
          "Firebase token does not contain a phone number.",
        );
      }
      return decoded.phone_number; // already E.164
    } catch (err: any) {
      this.logger.warn(`Firebase token verification failed: ${err.message}`);
      throw err;
    }
  }
}
