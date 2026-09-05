import { z } from 'zod';

export const createPaymentIntentSchema = z.object({
  levelSlug: z.string().optional(),
  levelOrder: z.coerce.number().optional(),
  levelId: z.string().optional(),
  idempotencyKey: z.string().optional(),
});

export const createPartialUpgradeIntentSchema = z.object({
  levelSlug: z.string().optional(),
  levelOrder: z.coerce.number().optional(),
  levelId: z.string().optional(),
  amount: z.coerce.number().positive('Amount must be greater than zero'),
});

export const getPaymentByReferenceSchema = {
  params: z.object({
    reference: z.string().min(1, 'Payment reference is required'),
  }),
};

export const getPaymentByIdSchema = {
  params: z.object({
    id: z.string().min(1, 'Payment ID is required'),
  }),
};

export const verifyPaymentSchema = {
  body: z.object({
    paymentIntentId: z.string().optional(),
    payment_intent_id: z.string().optional(),
    txHash: z.string().optional(),
    transactionHash: z.string().optional(),
    transaction_hash: z.string().optional(),
  }),
};

