export type Currency = "MZN" | "USD" | "EUR" | "ZAR";

export type LedgerEntryType = "DEBIT" | "CREDIT";

export type TransactionStatus =
  | "PENDING"
  | "PROCESSING"
  | "SUCCESS"
  | "FAILED"
  | "CANCELLED"
  | "EXPIRED"
  | "REFUNDED";

export interface LedgerEntry {
  accountId: string;
  type: LedgerEntryType;
  amountMinor: bigint;
  currency: Currency;
  reference: string;
}

/**
 * Monetary values are represented in minor units. Never use floating point
 * numbers for money. A transaction must balance to zero across its ledger
 * entries before it can be committed.
 */
export function assertBalanced(entries: readonly LedgerEntry[]): void {
  if (entries.length < 2) {
    throw new Error("LEDGER_REQUIRES_TWO_ENTRIES");
  }

  const totals = new Map<Currency, bigint>();

  for (const entry of entries) {
    if (entry.amountMinor <= 0n) {
      throw new Error("LEDGER_AMOUNT_MUST_BE_POSITIVE");
    }

    const signed = entry.type === "CREDIT" ? entry.amountMinor : -entry.amountMinor;
    totals.set(entry.currency, (totals.get(entry.currency) ?? 0n) + signed);
  }

  for (const [currency, total] of totals) {
    if (total !== 0n) {
      throw new Error(`LEDGER_UNBALANCED:${currency}`);
    }
  }
}

export function toMinorUnits(amount: string): bigint {
  if (!/^\d+(\.\d{1,2})?$/.test(amount)) {
    throw new Error("INVALID_MONETARY_AMOUNT");
  }

  const [whole, fraction = ""] = amount.split(".");
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
}
