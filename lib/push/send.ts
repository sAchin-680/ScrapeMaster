import 'server-only';
import { sendNotification, setVapidDetails, type WebPushError } from 'web-push';
import { env, isPushConfigured } from '@/lib/env';
import PushSubscription from '@/lib/models/push-subscription.model';
import { siteConfig } from '@/lib/site';

let configured = false;
function configure() {
  if (!configured) {
    setVapidDetails(
      env.VAPID_SUBJECT ?? siteConfig.url,
      env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      env.VAPID_PRIVATE_KEY!,
    );
    configured = true;
  }
}

export type PushPayload = {
  title: string;
  body: string;
  url: string;
  image?: string;
  tag?: string;
};

/**
 * Notify every browser following a product. Push services answer 404 or 410
 * for subscriptions that no longer exist; those are removed.
 */
export async function sendProductPush(productId: string, payload: PushPayload) {
  if (!isPushConfigured) return { sent: 0, removed: 0 };
  configure();

  const subscriptions = await PushSubscription.find({ products: productId }).lean();
  const message = JSON.stringify(payload);
  const gone: string[] = [];
  let sent = 0;

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.keys!.p256dh, auth: sub.keys!.auth },
          },
          message,
          { TTL: 60 * 60 * 24, urgency: 'normal', timeout: 10_000 },
        );
        sent++;
      } catch (error) {
        const status = (error as WebPushError).statusCode;
        if (status === 404 || status === 410) gone.push(sub.endpoint);
        else console.error('[push] send failed', status ?? error);
      }
    }),
  );

  if (gone.length) await PushSubscription.deleteMany({ endpoint: { $in: gone } });
  return { sent, removed: gone.length };
}
