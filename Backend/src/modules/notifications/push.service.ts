import webpush from 'web-push';
import { PushSubscription } from './push-subscription.model.js';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

let isWebPushConfigured = false;

export const configureWebPush = () => {
  if (isWebPushConfigured) return;
  
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY || !env.VAPID_SUBJECT) {
    logger.warn('[Web Push] Web Push is not configured. Missing VAPID variables.');
    return;
  }

  webpush.setVapidDetails(
    env.VAPID_SUBJECT,
    env.VAPID_PUBLIC_KEY,
    env.VAPID_PRIVATE_KEY
  );
  isWebPushConfigured = true;
  logger.info('[Web Push] VAPID details configured successfully.');
};

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

/**
 * Sends a web push notification to all valid subscriptions for a given user.
 * Invalid subscriptions (404, 410) are automatically removed.
 */
export const sendPushToUser = async (userId: string | any, payload: PushPayload) => {
  if (!isWebPushConfigured) {
    configureWebPush();
  }

  const subscriptions = await PushSubscription.find({ userId });
  if (subscriptions.length === 0) {
    return { sent: 0, removed: 0, failed: 0 };
  }

  if (!isWebPushConfigured) {
    logger.warn(`[Web Push] Cannot send push to user ${userId}: Web Push not configured.`);
    return { sent: 0, removed: 0, failed: subscriptions.length };
  }

  const payloadString = JSON.stringify(payload);
  
  let sent = 0;
  let removed = 0;
  let failed = 0;

  const pushPromises = subscriptions.map(async (sub) => {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.keys.p256dh,
            auth: sub.keys.auth
          }
        },
        payloadString
      );
      sent++;
    } catch (error: any) {
      if (error.statusCode === 404 || error.statusCode === 410) {
        // Subscription is no longer valid, remove it
        await PushSubscription.deleteOne({ _id: sub._id });
        removed++;
        logger.info(`[Web Push] Removed invalid subscription for endpoint (status ${error.statusCode})`);
      } else {
        logger.error(`[Web Push] Push notification failed for an endpoint: ${error.message}`);
        failed++;
      }
    }
  });

  await Promise.all(pushPromises);

  return { sent, removed, failed };
};
