import { z } from 'zod';

export const subscribeSchema = z.object({
  body: z.object({
    endpoint: z.string().min(1, 'Endpoint is required'),
    keys: z.object({
      p256dh: z.string().min(1, 'p256dh key is required'),
      auth: z.string().min(1, 'auth key is required'),
    }),
    device: z.string().optional(),
  }),
});

export const unsubscribeSchema = z.object({
  body: z.object({
    endpoint: z.string().min(1, 'Endpoint is required'),
  }),
});

export type SubscribeInput = z.infer<typeof subscribeSchema>['body'];
export type UnsubscribeInput = z.infer<typeof unsubscribeSchema>['body'];
