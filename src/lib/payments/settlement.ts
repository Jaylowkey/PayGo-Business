import type { Currency } from '@prisma/client';
import { financialReference } from '@/lib/finance/references';
import { postLedger } from '@/lib/finance/repositories/ledger';
import { updatePaymentStatus } from '@/lib/finance/repositories/payment';
import { findWallet } from '@/lib/finance/repositories/wallet';

export type SettlePaymentInput = {
  paymentId: string;
  providerPaymentId: string;
  amountMinor: bigint;
  currency: Currency;
  destinationWalletId: string;
  /** PayGo/NetShop clearing wallet holding the funds before settlement. */
  clearingWalletId: string;
};

/**
 * Settles a provider-confirmed payment by moving funds from the clearing
 * wallet to the destination wallet. This keeps the ledger balanced and
 * prevents creating money by crediting and debiting the same wallet.
 *
 * Provider webhook authentication must happen before this function is called.
 */
export async function settleConfirmedPayment(input: SettlePaymentInput) {
  if (input.amountMinor <= 0n) throw new Error('SETTLEMENT_AMOUNT_INVALID');
  if (!input.providerPaymentId.trim()) throw new Error('PROVIDER_PAYMENT_ID_REQUIRED');
  if (!input.clearingWalletId.trim()) throw new Error('CLEARING_WALLET_REQUIRED');
  if (input.clearingWalletId === input.destinationWalletId) {
    throw new Error('CLEARING_AND_DESTINATION_WALLET_MUST_DIFFER');
  }

  const [destinationWallet, clearingWallet] = await Promise.all([
    findWallet(input.destinationWalletId),
    findWallet(input.clearingWalletId),
  ]);

  if (!destinationWallet || destinationWallet.status !== 'ACTIVE') {
    throw new Error('DESTINATION_WALLET_UNAVAILABLE');
  }

  if (!clearingWallet || clearingWallet.status !== 'ACTIVE') {
    throw new Error('CLEARING_WALLET_UNAVAILABLE');
  }

  if (destinationWallet.currency !== input.currency) {
    throw new Error('SETTLEMENT_CURRENCY_MISMATCH');
  }

  if (clearingWallet.currency !== input.currency) {
    throw new Error('CLEARING_CURRENCY_MISMATCH');
  }

  const { prisma } = await import('@/lib/db');
  const payment = await prisma.payment.findUnique({
    where: { id: input.paymentId },
  });

  if (!payment) throw new Error('PAYMENT_NOT_FOUND');
  if (payment.providerPaymentId !== input.providerPaymentId) {
    throw new Error('PROVIDER_PAYMENT_MISMATCH');
  }
  if (payment.amountMinor !== input.amountMinor || payment.currency !== input.currency) {
    throw new Error('SETTLEMENT_AMOUNT_MISMATCH');
  }

  // Webhooks may be delivered more than once. A successful payment is
  // already settled and must be treated as an idempotent no-op.
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
      clearingWalletId: input.clearingWalletId,
      destinationWalletId: input.destinationWalletId,
      settlement: true,
    },
    entries: [
      {
        walletId: input.clearingWalletId,
        amountMinor: input.amountMinor,
        direction: 'DEBIT',
        currency: input.currency,
        reference: `${payment.reference}:CLEARING_DEBIT`,
      },
      {
        walletId: input.destinationWalletId,
        amountMinor: input.amountMinor,
        direction: 'CREDIT',
        currency: input.currency,
        reference: `${payment.reference}:DESTINATION_CREDIT`,
      },
    ],
  });

  return updatePaymentStatus(payment.id, 'SUCCESS', input.providerPaymentId);
}
