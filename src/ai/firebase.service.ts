import * as admin from 'firebase-admin';
import { Injectable, Logger } from '@nestjs/common';
import type { NotificationKey, ProgressStatusKey } from './progress-status';

@Injectable()
export class FirebaseService {
  private readonly logger = new Logger(FirebaseService.name);
  private initializationAttempted = false;
  private initialized = false;

  constructor() {}

  private normalizePrivateKey(privateKey?: string): string | undefined {
    if (!privateKey) {
      return undefined;
    }

    const trimmedKey = privateKey.trim();
    const unwrappedKey =
      trimmedKey.startsWith('"') && trimmedKey.endsWith('"')
        ? trimmedKey.slice(1, -1)
        : trimmedKey;

    return unwrappedKey.replace(/\\n/g, '\n');
  }

  private ensureInitialized(): boolean {
    if (this.initialized || admin.apps.length > 0) {
      this.initialized = true;
      return true;
    }

    if (this.initializationAttempted) {
      return false;
    }

    this.initializationAttempted = true;

    const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
    const privateKey = this.normalizePrivateKey(
      process.env.FIREBASE_PRIVATE_KEY,
    );

    if (!projectId || !clientEmail || !privateKey) {
      this.logger.warn(
        'Firebase Admin is disabled because FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, or FIREBASE_PRIVATE_KEY is missing.',
      );
      return false;
    }

    if (
      !privateKey.startsWith('-----BEGIN PRIVATE KEY-----') ||
      !privateKey.trim().endsWith('-----END PRIVATE KEY-----')
    ) {
      this.logger.error(
        'Firebase Admin is disabled because FIREBASE_PRIVATE_KEY is not in the expected service-account format.',
      );
      return false;
    }

    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      this.initialized = true;
      this.logger.log('Firebase Admin initialized successfully.');
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown initialization error';
      this.logger.error(
        `Firebase Admin initialization failed. Notifications will be skipped. ${message}`,
        error instanceof Error ? error.stack : undefined,
      );
      return false;
    }
  }

  private async sendMessageSafely(
    message: admin.messaging.Message,
    context: string,
  ): Promise<string | null> {
    if (!this.ensureInitialized()) {
      return null;
    }

    try {
      return await admin.messaging().send(message);
    } catch (error) {
      const messageText =
        error instanceof Error ? error.message : 'Unknown messaging error';
      this.logger.error(
        `Firebase notification failed during ${context}. Continuing without push delivery. ${messageText}`,
        error instanceof Error ? error.stack : undefined,
      );
      return null;
    }
  }

  async sendNotification(
    token: string,
    titleKey: NotificationKey,
    bodyKey: NotificationKey,
  ) {
    return this.sendMessageSafely(
      {
        token,
        data: {
          type: 'AI_RESPONSE_READY',
          titleKey,
          bodyKey,
        },
      },
      `notification:${titleKey}`,
    );
  }

  async sendProgressNotification(
    token: string,
    stepKey: ProgressStatusKey,
  ) {
    return this.sendMessageSafely(
      {
        token,
        data: {
          type: 'AI_PROGRESS',
          stepKey,
        },
      },
      `progress:${stepKey}`,
    );
  }
}
