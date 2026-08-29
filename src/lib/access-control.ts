export type AccountType = "INDIVIDUAL" | "BUSINESS";

export type BusinessRole =
  | "OWNER"
  | "ADMIN"
  | "FINANCE"
  | "DEVELOPER"
  | "SUPPORT"
  | "VIEWER";

export type Feature =
  | "overview"
  | "payments"
  | "wallet"
  | "payouts"
  | "customers"
  | "invoices"
  | "payment_links"
  | "qr"
  | "marketing"
  | "notifications"
  | "developers"
  | "api_keys"
  | "webhooks"
  | "team"
  | "kyc"
  | "kyb"
  | "reports"
  | "settings";

/**
 * Product policy, not a UI-only rule. Every protected server action/API route
 * must evaluate this policy before performing the operation.
 *
 * Individuals receive the core personal/business-lite experience. Business
 * accounts unlock organization, developer, team, advanced reporting and
 * merchant tooling after the appropriate KYB status is satisfied.
 */
const individualFeatures = new Set<Feature>([
  "overview",
  "payments",
  "wallet",
  "payouts",
  "customers",
  "payment_links",
  "qr",
  "notifications",
  "kyc",
  "reports",
  "settings",
]);

const businessFeatures = new Set<Feature>([
  ...individualFeatures,
  "invoices",
  "marketing",
  "developers",
  "api_keys",
  "webhooks",
  "team",
  "kyb",
]);

const roleFeatures: Record<BusinessRole, Set<Feature>> = {
  OWNER: new Set(businessFeatures),
  ADMIN: new Set(businessFeatures),
  FINANCE: new Set([
    "overview",
    "payments",
    "wallet",
    "payouts",
    "customers",
    "invoices",
    "payment_links",
    "qr",
    "notifications",
    "reports",
    "settings",
  ]),
  DEVELOPER: new Set([
    "overview",
    "payments",
    "notifications",
    "developers",
    "api_keys",
    "webhooks",
    "settings",
  ]),
  SUPPORT: new Set([
    "overview",
    "payments",
    "customers",
    "notifications",
  ]),
  VIEWER: new Set(["overview", "payments", "reports", "notifications"]),
};

export function canAccessFeature(
  accountType: AccountType,
  feature: Feature,
  role?: BusinessRole,
): boolean {
  if (accountType === "INDIVIDUAL") {
    return individualFeatures.has(feature);
  }

  if (!role) return false;
  return roleFeatures[role].has(feature);
}

export function assertFeatureAccess(
  accountType: AccountType,
  feature: Feature,
  role?: BusinessRole,
): void {
  if (!canAccessFeature(accountType, feature, role)) {
    throw new Error(`FEATURE_ACCESS_DENIED:${feature}`);
  }
}

export function isBusiness(accountType: AccountType): boolean {
  return accountType === "BUSINESS";
}
