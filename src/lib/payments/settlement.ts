import type { Currency } from '@prisma/client';
import { financialReference } from '@/lib/finance/references';
import { postLedger } from '@/lib/finance/repositories/ledger';
import { updatePaymentStatus } from '@/lib/finance/repositories/payment';
import { findWallet } from '@/lib/finance/repositories/wallet';

export type SettlePaymentInput = {
  paymentId: string;
  providerPaymentId: string;
  grossAmountMinor: bigint;
  netAmountMinor: bigint;
  currency: Currency;
  destinationWalletId: string;
  clearingWalletId: string;
  paygoFeeMinor?: bigint;
  netshopFeeMinor?: bigint;
  revenueWalletId?: string;
};

/**
 * Settles a confirmed payment using balanced internal accounts.
 *
 * The clearing account is debited by the NetShop net amount. That net amount
 * is split between the merchant and PayGo revenue. NetShop's provider fee is
 * recorded as metadata because it is already withheld by the provider and is
 * not a PayGo liability to the merchant.
 */
export async function settleConfirmedPayment(input: SettlePaymentInput) {
  if (input.grossAmountMinor <= 0n) throw new Error('SETTLEMENT_AMOUNT_INVALID');
  if (input.netAmountMinor <= 0n || input.netAmountMinor > input.grossAmountMinor) {
    throw new Error('SETTLEMENT_NET_AMOUNT_INVALID');
  }
  if (!input.providerPaymentId.trim()) throw new Error('PROVIDER_PAYMENT_ID_REQUIRED');
  if (!input.clearingWalletId.trim()) throw new Error('CLEARING_WALLET_REQUIRED');
  if (input.clearingWalletId === input.destinationWalletId) {
    throw new Error('CLEARING_AND_DESTINATION_WALLET_MUST_DIFFER');
  }

  const paygoFeeMinor = input.paygoFeeMinor ?? 0n;
  if (paygoFeeMinor < 0n || paygoFeeMinor > input.netAmountMinor) {
    throw new Error('PAYGO_FEE_INVALID');
  }

  const merchantCreditMinor = input.netAmountMinor - paygoFeeMinor;
  const [destinationWallet, clearingWallet] = await Promise.all([
    findWallet(input.destinationWalletId),
    findWallet(input.clearingWalletId),
  ]);

  if (!destinationWallet || destinationWallet.status !== 'ACTIVE') throw new Error('DESTINATION_WALLET_UNAVAILABLE');
  if (!clearingWallet || clearingWallet.status !== 'ACTIVE') throw new Error('CLEARING_WALLET_UNAVAILABLE');
  if (destinationWallet.currency !== input.currency || clearingWallet.currency !== input.currency) {
    throw new Error('SETTLEMENT_CURRENCY_MISMATCH');
  }

  if (input.revenueWalletId && input.revenueWalletId === input.clearingWalletId) {
    throw new Error('REVENUE_AND_CLEARING_WALLET_MUST_DIFFER');
  }

  const { prisma } = await import('@/lib/db');
  const payment = await prisma.payment.findUnique({ where: { id: input.paymentId } });
  if (!payment) throw new Error('PAYMENT_NOT_FOUND');
  if (payment.providerPaymentId !== input.providerPaymentId) throw new Error('PROVIDER_PAYMENT_MISMATCH');
  if (payment.amountMinor !== input.grossAmountMinor || payment.currency !== input.currency) {
    throw new Error('SETTLEMENT_AMOUNT_MISMATCH');
  }
  if (payment.status === 'SUCCESS') return payment;
  if (payment.status !== 'PROCESSING' && payment.status !== 'PENDING') {
    throw new Error(`PAYMENT_NOT_SETTLEABLE:${payment.status}`);
  }

  const entries = [
    {
      walletId: input.clearingWalletId,
      amountMinor: input.netAmountMinor,
      direction: 'DEBIT' as const,
      currency: input.currency,
      reference: `${payment.reference}:CLEARING_DEBIT`,
    },
    {
      walletId: input.destinationWalletId,
      amountMinor: merchantCreditMinor,
      direction: 'CREDIT' as const,
      currency: input.currency,
      reference: `${payment.reference}:MERCHANT_CREDIT`,
    },
  ];

  if (paygoFeeMinor > 0n && input.revenueWalletId) {
    const revenueWallet = await findWallet(input.revenueWalletId);
    if (!revenueWallet || revenueWallet.status !== 'ACTIVE') throw new Error('REVENUE_WALLET_UNAVAILABLE');
    if (revenueWallet.currency !== input.currency) throw new Error('REVENUE_CURRENCY_MISMATCH');
    entries.push({
      walletId: input.revenueWalletId,
      amountMinor: paygoFeeMinor,
      direction: 'CREDIT' as const,
      currency: input.currency,
      reference: `${payment.reference}:PAYGO_FEE`,
    });
  } else if (paygoFeeMinor > 0n) {
    throw new Error('REVENUE_WALLET_REQUIRED');
  }

  await postLedger({
    reference: financialReference('LT'),
    description: `Settlement for ${payment.reference}`,
    metadata: {
      paymentId: payment.id,
      paymentReference: payment.reference,
      providerPaymentId: input.providerPaymentId,
      grossAmountMinor: input.grossAmountMinor.toString(),
      netAmountMinor: input.netAmountMinor.toString(),
      netshopFeeMinor: (input.netshopFeeMinor ?? input.grossAmountMinor - input.netAmountMinor).toString(),
      paygoFeeMinor: paygoFeeMinor.toString(),
      settlement: true,
    },
    entries,
  });

  return updatePaymentStatus(payment.id, 'SUCCESS', input.providerPaymentId);
}
