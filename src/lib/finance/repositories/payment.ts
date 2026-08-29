import type { Currency, PaymentStatus } from '@prisma/client';
import { prisma } from '@/lib/db';

export async function findPaymentByIdempotencyKey(idempotencyKey: string) {
  return prisma.payment.findUnique({ where: { idempotencyKey } });
}

export async function createPayment(data: {
  reference: string;
  provider: string;
  providerPaymentId?: string;
  userId?: string;
  organizationId?: string;
  walletId?: string;
  amountMinor: bigint;
  feeMinor?: bigint;
  currency: Currency;
  status?: PaymentStatus;
  idempotencyKey: string;
  description?: string;
  metadata?: object;
}) {
  return prisma.payment.create({
    data: {
      ...data,
      metadata: data.metadata as never,
    },
  });
}

export async function updatePaymentStatus(id: string, status: PaymentStatus, providerPaymentId?: string) {
  return prisma.payment.update({
    where: { id },
    data: { status, providerPaymentId },
  });
}
