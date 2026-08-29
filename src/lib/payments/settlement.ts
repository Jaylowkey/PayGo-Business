import type { Currency, PaymentStatus } from '@prisma/client';
import { financialReference } from '@/lib/finance/references';
import { postLedger } from '@/lib/finance/repositories/ledger';
import { findPaymentByIdempotencyKey, updatePaymentStatus } from '@/lib/finance/repositories/payment';
import { findWallet } from '@/lib/finance/repositories/wallet';

export type SettlePaymentInput = {
  paymentId: string;
  providerPaymentId: string;
  amountMinor: bigint;
  currency: Currency;
  destinationWalletId: string;
};

/**
 * Settles only after an authenticated provider confirmation has been verified
 * by the webhook layer. The ledger is the source of truth for wallet balance.
 */
export async function settleConfirmedPayment(input: SettlePaymentInput) {
  if (input.amountMinor <= 0n) throw new Error('SETTLEMENT_AMOUNT_INVALID');
  if (!input.providerPaymentId.trim()) throw new Error('PROVIDER_PAYMENT_ID_REQUIRED');

  const wallet = await findWallet(input.destinationWalletId);
  if (!wallet || wallet.status !== 'ACTIVE') throw new Error('DESTINATION_WALLET_UNAVAILABLE');
  if (wallet.currency !== input.currency) throw new Error('SETTLEMENT_CURRENCY_MISMATCH');

  const payment = await import('@prisma/client').then(({ PrismaClient }) => PrismaClient).then(async () => {
    const { prisma } = await import('@/lib/db');
    return prisma.payment.findUnique({ where: { id: input.paymentId } });
  });

  if (!payment) throw new Error('PAYMENT_NOT_FOUND');
  if (payment.providerPaymentId !== input.providerPaymentId) throw new Error('PROVIDER_PAYMENT_MISMATCH');
  if (payment.amountMinor !== input.amountMinor || payment.currency !== input.currency) {
    throw new Error('SETTLEMENT_AMOUNT_MISMATCH');
  }
  if (payment.status === 'SUCCESS') return payment;
  if (payment.status !== 'PROCESSING' && payment.status !== 'PENDING') {
    throw new Error(`PAYMENT_NOT_SETTLEABLE:${payment.status}`);
  }

  const ledgerReference = financialReference('LT');

  await postLedger({
    reference: ledgerReference,
    description: `Settlement for ${payment.reference}`,
    metadata: {
      paymentId: payment.id,
      paymentReference: payment.reference,
      providerPaymentId: input.providerPaymentId,
      settlement: true,
    },
    entries: [
      {
        walletId: input.destinationWalletId,
        amountMinor: input.amountMinor,
        direction: 'CREDIT',
        currency: input.currency,
        reference: `${payment.reference}:CREDIT`,
      },
      {
        walletId: input.destinationWalletId,
        amountMinor: input.amountMinor,
        direction: 'DEBIT',
        currency: input.currency,
        reference: `${payment.reference}:CLEARING`,
      },
    ],
  });

  return updatePaymentStatus(payment.id, 'SUCCESS', input.providerPaymentId);
}
