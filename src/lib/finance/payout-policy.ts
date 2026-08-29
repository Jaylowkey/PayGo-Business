import type { AccountType, BusinessRole } from '@/lib/access-control';

export function canCreatePayout(accountType: AccountType, role?: BusinessRole): boolean {
  if (accountType === 'INDIVIDUAL') return true;
  return role === 'OWNER' || role === 'ADMIN' || role === 'FINANCE';
}

export function assertPayoutAllowed(accountType: AccountType, role?: BusinessRole): void {
  if (!canCreatePayout(accountType, role)) throw new Error('PAYOUT_ACCESS_DENIED');
}
