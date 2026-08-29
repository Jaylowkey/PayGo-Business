import type { VerificationStatus } from './types';

const STATUS_MAP: Record<string, VerificationStatus> = {
  not_started: 'NOT_STARTED',
  pending: 'IN_REVIEW',
  in_review: 'IN_REVIEW',
  action_required: 'ACTION_REQUIRED',
  approved: 'VERIFIED',
  verified: 'VERIFIED',
  declined: 'REJECTED',
  rejected: 'REJECTED',
  expired: 'EXPIRED',
};

export function mapDiditStatus(value: string | undefined): VerificationStatus {
  if (!value) return 'IN_REVIEW';
  return STATUS_MAP[value.toLowerCase()] ?? 'IN_REVIEW';
}
