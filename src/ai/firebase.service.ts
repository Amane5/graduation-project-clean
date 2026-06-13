import * as admin from 'firebase-admin';
import { Injectable } from '@nestjs/common';

@Injectable()
export class FirebaseService {
  constructor() {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
    }
    console.log('PROJECT ID:', process.env.FIREBASE_PROJECT_ID)

  }

  async sendNotification(token: string, title: string, body: string) {
    return admin.messaging().send({
      token,
      notification: {
        title,
        body,
      },
      data: {
        type: 'AI_RESPONSE_READY',
      },
    });
  }

  async sendProgressNotification(
  token: string,
  step: string,
) {
  return admin.messaging().send({
    token,
    data: {
      type: 'AI_PROGRESS',
      step,
    },
  });
}
}