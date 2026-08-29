import { z } from 'zod';

export const createPaymentSchema = z.object({
  amount: z.coerce.number().positive().finite(),
  currency: z.enum(['MZN', 'USD', 'ZAR', 'EUR']),
  description: z.string().trim().max(500).optional(),
  customer: z.object({
    name: z.string().trim().max(120).optional(),
    email: z.string().email().optional(),
    phone: z.string().trim().max(30).optional(),
  }).optional(),
  return_url: z.string().url().optional(),
  webhook_url: z.string().url().optional(),
  metadata: z.record(z.string(), z.string()).optional(),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
