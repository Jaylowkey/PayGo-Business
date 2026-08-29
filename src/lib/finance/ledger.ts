import { assertBalanced, type Currency, type LedgerEntry } from '@/lib/financial-ledger';

export type LedgerPosting = LedgerEntry & { id: string };

export type PostingBatch = {
  reference: string;
  entries: readonly LedgerPosting[];
};

/**
 * Domain guard for every persisted posting batch. Persistence must execute the
 * batch atomically in a database transaction and reject duplicate references.
 */
export function validatePostingBatch(batch: PostingBatch): void {
  if (!batch.reference.trim()) throw new Error('LEDGER_REFERENCE_REQUIRED');
  assertBalanced(batch.entries);
}

export function signedBalance(entries: readonly LedgerPosting[], accountId: string, currency: Currency): bigint {
  return entries
    .filter((entry) => entry.accountId === accountId && entry.currency === currency)
    .reduce((balance, entry) => balance + (entry.type === 'CREDIT' ? entry.amountMinor : -entry.amountMinor), 0n);
}
