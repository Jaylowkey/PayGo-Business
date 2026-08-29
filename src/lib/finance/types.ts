export const CURRENCIES = ['MZN', 'USD', 'ZAR', 'EUR'] as const;
export type Currency = (typeof CURRENCIES)[number];

export const PAYMENT_STATUSES = ['PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'CANCELLED', 'EXPIRED', 'REFUNDED'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export type Money = {
  amount: bigint;
  currency: Currency;
};
