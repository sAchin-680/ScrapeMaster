import mongoose, { type InferSchemaType, type Model } from 'mongoose';

/** One browser's Web Push subscription and the products it follows. */
const pushSubscriptionSchema = new mongoose.Schema(
  {
    endpoint: { type: String, required: true, unique: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    products: { type: [mongoose.Schema.Types.ObjectId], default: [], index: true },
  },
  { timestamps: true },
);

export type PushSubscriptionDocument = InferSchemaType<typeof pushSubscriptionSchema>;

const PushSubscription: Model<PushSubscriptionDocument> =
  (mongoose.models.PushSubscription as Model<PushSubscriptionDocument>) ||
  mongoose.model<PushSubscriptionDocument>('PushSubscription', pushSubscriptionSchema);

export default PushSubscription;
