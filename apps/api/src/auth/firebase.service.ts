// ============================================================
// BuildMart — FirebaseService
// Optional Firebase Admin SDK (safe for development)
// ============================================================

import { Injectable, OnModuleInit, Logger, InternalServerErrorException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as admin from "firebase-admin";

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private app?: admin.app.App;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const projectId = this.config.get<string>("FIREBASE_PROJECT_ID");
    const privateKey = this.config.get<string>("FIREBASE_PRIVATE_KEY");
    const clientEmail = this.config.get<string>("FIREBASE_CLIENT_EMAIL");

    // If Firebase config missing → skip initialization
    if (!projectId || !privateKey || !clientEmail) {
      this.logger.warn("⚠ Firebase disabled (development mode)");
      return;
    }

    try {
      if (admin.apps.length === 0) {
        this.app = admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            privateKey: privateKey.replace(/\\n/g, "\n"),
            clientEmail,
          }),
        });
      } else {
        this.app = admin.apps[0]!;
      }

      this.logger.log("🔥 Firebase Admin SDK initialized.");
    } catch (err: any) {
      this.logger.warn("⚠ Firebase initialization skipped.");
    }
  }

  async verifyIdToken(idToken: string): Promise<string> {
    if (!this.app) {
      throw new InternalServerErrorException("Firebase is not configured.");
    }

    try {
      const decoded = await this.app.auth().verifyIdToken(idToken, true);

      if (!decoded.phone_number) {
        throw new InternalServerErrorException(
          "Firebase token does not contain a phone number.",
        );
      }

      return decoded.phone_number;
    } catch (err: any) {
      this.logger.warn(`Firebase token verification failed: ${err.message}`);
      throw err;
    }
  }
}