import type { Currency, PayoutStatus } from '@prisma/client';
import { prisma } from '@/lib/db';

export async function findPayoutByIdempotencyKey(idempotencyKey: string) {
  return prisma.payout.findUnique({ where: { idempotencyKey } });
}

export async function createPayout(data: {
  reference: string;
  provider: string;
  userId?: string;
  organizationId?: string;
  walletId: string;
  amountMinor: bigint;
  feeMinor?: bigint;
  currency: Currency;
  destination: object;
  idempotencyKey: string;
  status?: PayoutStatus;
}) {
  return prisma.payout.create({
    data: {
      ...data,
      destination: data.destination as never,
    },
  });
}

export async function updatePayoutStatus(id: string, status: PayoutStatus, providerPayoutId?: string) {
  return prisma.payout.update({
    where: { id },
    data: { status, providerPayoutId },
  });
}
