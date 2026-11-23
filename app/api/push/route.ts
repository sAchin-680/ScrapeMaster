import { NextResponse, type NextRequest } from 'next/server';
import { isValidObjectId } from 'mongoose';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { isPushConfigured } from '@/lib/env';
import PushSubscription from '@/lib/models/push-subscription.model';
import { isAllowedPushEndpoint } from '@/lib/push/endpoint';
import { WATCHLIST_LIMIT } from '@/lib/watchlist';

export const dynamic = 'force-dynamic';

const productId = z.string().refine((id) => isValidObjectId(id), 'Invalid product');
const endpoint = z
  .string()
  .max(1000)
  .refine(isAllowedPushEndpoint, 'Not a browser push service');

const subscribeSchema = z.object({
  productId,
  subscription: z.object({
    endpoint,
    // Sizes fixed by the Web Push spec: a 65-byte P-256 public key and a
    // 16-byte auth secret, base64url-encoded (with optional padding).
    keys: z.object({
      p256dh: z.string().regex(/^[A-Za-z0-9_-]{87}={0,1}$/),
      auth: z.string().regex(/^[A-Za-z0-9_-]{22}={0,2}$/),
    }),
  }),
});

const unsubscribeSchema = z.object({ endpoint, productId: productId.optional() });

const disabled = () =>
  NextResponse.json({ error: 'Push notifications are not configured' }, { status: 503 });

/** Follow a product's price on this device. */
export async function POST(request: NextRequest) {
  if (!isPushConfigured) return disabled();
  const parsed = subscribeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: z.flattenError(parsed.error) }, { status: 400 });
  }
  const { subscription, productId: id } = parsed.data;
  await connectDB();
  const existing = await PushSubscription.findOne({ endpoint: subscription.endpoint })
    .select('products')
    .lean();
  if (existing && existing.products.length >= WATCHLIST_LIMIT) {
    return NextResponse.json(
      { error: 'Too many products on this device' },
      { status: 400 },
    );
  }
  await PushSubscription.updateOne(
    { endpoint: subscription.endpoint },
    { $set: { keys: subscription.keys }, $addToSet: { products: id } },
    { upsert: true },
  );
  return NextResponse.json({ ok: true });
}

/** Stop following one product, or remove the device entirely. */
export async function DELETE(request: NextRequest) {
  if (!isPushConfigured) return disabled();
  const parsed = unsubscribeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: z.flattenError(parsed.error) }, { status: 400 });
  }
  await connectDB();
  const { endpoint: url, productId: id } = parsed.data;
  if (id) {
    await PushSubscription.updateOne({ endpoint: url }, { $pull: { products: id } });
    await PushSubscription.deleteOne({ endpoint: url, products: { $size: 0 } });
  } else {
    await PushSubscription.deleteOne({ endpoint: url });
  }
  return NextResponse.json({ ok: true });
}
