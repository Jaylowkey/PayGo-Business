import type { Currency, PaymentStatus } from '@prisma/client';
import { financialReference } from '@/lib/finance/references';
import { toMinorUnits } from '@/lib/financial-ledger';
import type { PaymentProvider } from './provider';
import {
  createPayment,
  findPaymentByIdempotencyKey,
  updatePaymentStatus,
} from '@/lib/finance/repositories/payment';

export type CreateBusinessPaymentInput = {
  amount: string;
  currency: Currency;
  idempotencyKey: string;
  userId?: string;
  organizationId?: string;
  walletId?: string;
  description?: string;
  customerPhone?: string;
  returnUrl?: string;
  webhookUrl?: string;
  metadata?: Record<string, string>;
};

export type PaymentServiceResult = {
  paymentId: string;
  reference: string;
  status: PaymentStatus;
  providerPaymentId?: string;
  checkoutUrl?: string;
};

/**
 * Creates a payment at PayGo and the configured provider.
 *
 * Important: provider creation never settles a wallet. Wallet settlement is
 * deliberately deferred until a trusted provider confirmation/webhook.
 */
export async function createBusinessPayment(
  input: CreateBusinessPaymentInput,
  provider: PaymentProvider,
): Promise<PaymentServiceResult> {
  const idempotencyKey = input.idempotencyKey.trim();
  if (!idempotencyKey) throw new Error('IDEMPOTENCY_KEY_REQUIRED');

  const existing = await findPaymentByIdempotencyKey(idempotencyKey);
  if (existing) {
    return {
      paymentId: existing.id,
      reference: existing.reference,
      status: existing.status,
      providerPaymentId: existing.providerPaymentId ?? undefined,
    };
  }

  const amountMinor = toMinorUnits(input.amount);
  const reference = financialReference('PG');

  const payment = await createPayment({
    reference,
    provider: provider.name,
    userId: input.userId,
    organizationId: input.organizationId,
    walletId: input.walletId,
    amountMinor,
    currency: input.currency,
    idempotencyKey,
    description: input.description,
    metadata: {
      customerPhone: input.customerPhone,
      returnUrl: input.returnUrl,
      webhookUrl: input.webhookUrl,
      ...input.metadata,
    },
    status: 'PENDING',
  });

  try {
    const providerPayment = await provider.createPayment({
      reference,
      amount: amountMinor,
      currency: input.currency,
      description: input.description,
      customerPhone: input.customerPhone,
      returnUrl: input.returnUrl,
      webhookUrl: input.webhookUrl,
    });

    const updated = await updatePaymentStatus(
      payment.id,
      providerPayment.status === 'SUCCESS' ? 'PROCESSING' : providerPayment.status,
      providerPayment.providerPaymentId,
    );

    return {
      paymentId: updated.id,
      reference: updated.reference,
      status: updated.status,
      providerPaymentId: updated.providerPaymentId ?? undefined,
      checkoutUrl: providerPayment.checkoutUrl,
    };
  } catch (error) {
    await updatePaymentStatus(payment.id, 'FAILED');
    throw error;
  }
}
