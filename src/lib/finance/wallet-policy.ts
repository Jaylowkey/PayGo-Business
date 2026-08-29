import type { AccountType, BusinessRole } from '@/lib/access-control';
import type { VerificationStatus } from '@/lib/compliance/provider';

export type WalletCapability = 'VIEW_BALANCE' | 'RECEIVE_FUNDS' | 'TRANSFER' | 'PAYOUT';

export function canUseWalletCapability(
  accountType: AccountType,
  kycStatus: VerificationStatus,
  kybStatus: VerificationStatus | undefined,
  capability: WalletCapability,
  role?: BusinessRole,
): boolean {
  if (accountType === 'INDIVIDUAL') {
    if (kycStatus !== 'VERIFIED') return capability === 'VIEW_BALANCE';
    return capability !== 'PAYOUT' || true;
  }

  if (kybStatus !== 'VERIFIED') return capability === 'VIEW_BALANCE';
  if (capability === 'PAYOUT' && !['OWNER', 'ADMIN', 'FINANCE'].includes(role ?? '')) return false;
  return true;
}
