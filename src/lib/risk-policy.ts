import type { AccountType } from "./access-control";

export type VerificationStatus =
  | "NOT_STARTED"
  | "IN_REVIEW"
  | "ACTION_REQUIRED"
  | "VERIFIED"
  | "REJECTED"
  | "EXPIRED";

export type SensitiveAction =
  | "CREATE_API_KEY"
  | "ROTATE_API_KEY"
  | "CREATE_PAYOUT"
  | "CHANGE_PAYOUT_DESTINATION"
  | "CHANGE_SECURITY_SETTINGS"
  | "INVITE_TEAM_MEMBER";

export function requiresVerifiedIdentity(
  accountType: AccountType,
  action: SensitiveAction,
): boolean {
  if (action === "CREATE_API_KEY" || action === "ROTATE_API_KEY") return accountType === "BUSINESS";
  return true;
}

export function isVerificationComplete(status: VerificationStatus): boolean {
  return status === "VERIFIED";
}

export function assertVerification(status: VerificationStatus, scope: "KYC" | "KYB"): void {
  if (!isVerificationComplete(status)) {
    throw new Error(`${scope}_VERIFICATION_REQUIRED`);
  }
}
