import type { Currency } from '@prisma/client';
import { prisma } from '@/lib/db';

export async function findWallet(walletId: string) {
  return prisma.wallet.findUnique({ where: { id: walletId } });
}

export async function findOrCreateUserWallet(userId: string, currency: Currency) {
  const existing = await prisma.wallet.findFirst({ where: { userId, currency, status: 'ACTIVE' } });
  if (existing) return existing;
  return prisma.wallet.create({ data: { userId, currency, status: 'ACTIVE' } });
}

export async function findOrCreateOrganizationWallet(organizationId: string, currency: Currency) {
  const existing = await prisma.wallet.findFirst({ where: { organizationId, currency, status: 'ACTIVE' } });
  if (existing) return existing;
  return prisma.wallet.create({ data: { organizationId, currency, status: 'ACTIVE' } });
}

export async function getWalletBalance(walletId: string, currency: Currency) {
  const result = await prisma.ledgerEntry.groupBy({
    by: ['direction'],
    where: { walletId, currency },
    _sum: { amountMinor: true },
  });

  return result.reduce((balance, row) => {
    const amount = row._sum.amountMinor ?? 0n;
    return balance + (row.direction === 'CREDIT' ? amount : -amount);
  }, 0n);
}
