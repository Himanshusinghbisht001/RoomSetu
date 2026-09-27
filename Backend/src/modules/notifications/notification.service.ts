import { PushSubscription } from './push-subscription.model.js';
import { SubscribeInput, UnsubscribeInput } from './notification.schema.js';
import { AppError } from '../../utils/AppError.js';

export const subscribe = async (userId: string, input: SubscribeInput) => {
  const subscription = await PushSubscription.findOneAndUpdate(
    { endpoint: input.endpoint },
    {
      userId,
      keys: input.keys,
      device: input.device,
    },
    { new: true, upsert: true }
  );

  return {
    id: subscription._id,
    endpoint: subscription.endpoint,
    device: subscription.device,
    createdAt: subscription.createdAt,
    updatedAt: subscription.updatedAt,
  };
};

export const unsubscribe = async (userId: string, input: UnsubscribeInput) => {
  const subscription = await PushSubscription.findOne({ endpoint: input.endpoint });

  if (!subscription) {
    throw AppError.notFound('Subscription not found');
  }

  if (subscription.userId.toString() !== userId) {
    throw AppError.forbidden('You do not have permission to delete this subscription');
  }

  await subscription.deleteOne();
};
