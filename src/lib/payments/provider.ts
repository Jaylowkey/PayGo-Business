import type { Currency, PaymentStatus } from '../finance/types';

export type CreatePaymentInput = {
  reference: string;
  amount: bigint;
  currency: Currency;
  description?: string;
  customerPhone?: string;
  returnUrl?: string;
  webhookUrl?: string;
};

export type ProviderPayment = {
  providerPaymentId: string;
  status: PaymentStatus;
  checkoutUrl?: string;
  rawReference?: string;
};

export interface PaymentProvider {
  readonly name: string;
  createPayment(input: CreatePaymentInput): Promise<ProviderPayment>;
  getPayment(providerPaymentId: string): Promise<ProviderPayment>;
  refundPayment(providerPaymentId: string, amount?: bigint): Promise<ProviderPayment>;
}
