import type { Currency } from './types';
import type { LedgerPosting } from './ledger';

export function calculateWalletBalance(
  entries: readonly LedgerPosting[],
  walletId: string,
  currency: Currency,
): bigint {
  return entries
    .filter((entry) => entry.walletId === walletId && entry.currency === currency)
    .reduce((balance, entry) => balance + (entry.type === 'CREDIT' ? entry.amountMinor : -entry.amountMinor), 0n);
}

export function assertSufficientBalance(
  entries: readonly LedgerPosting[],
  walletId: string,
  currency: Currency,
  amountMinor: bigint,
): void {
  if (amountMinor <= 0n) throw new Error('WALLET_AMOUNT_MUST_BE_POSITIVE');
  const balance = calculateWalletBalance(entries, walletId, currency);
  if (balance < amountMinor) throw new Error('WALLET_INSUFFICIENT_FUNDS');
}
