import { prisma } from '@/lib/db';
import { validateLedgerTransaction } from '@/lib/finance/ledger';
import type { Currency, LedgerDirection, Prisma } from '@prisma/client';

export type PostLedgerInput = {
  reference: string;
  description?: string;
  metadata?: Prisma.InputJsonValue;
  entries: Array<{
    walletId: string;
    amountMinor: bigint;
    direction: LedgerDirection;
    currency: Currency;
    reference: string;
  }>;
};

export async function postLedger(input: PostLedgerInput) {
  validateLedgerTransaction({
    reference: input.reference,
    lines: input.entries.map((entry) => ({
      accountId: entry.walletId,
      amount: entry.amountMinor,
      currency: entry.currency,
      direction: entry.direction,
      reference: entry.reference,
    })),
    metadata: typeof input.metadata === 'object' && input.metadata !== null ? {} : undefined,
  });

  return prisma.$transaction(async (tx) => {
    const transaction = await tx.ledgerTransaction.create({
      data: {
        reference: input.reference,
        description: input.description,
        metadata: input.metadata,
        entries: {
          create: input.entries.map((entry) => ({
            walletId: entry.walletId,
            amountMinor: entry.amountMinor,
            direction: entry.direction,
            currency: entry.currency,
            reference: entry.reference,
          })),
        },
      },
      include: { entries: true },
    });

    return transaction;
  });
}
