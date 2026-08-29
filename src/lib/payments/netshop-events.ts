export type NetShopChargeStatus = 'paid' | 'pending' | 'failed';

export type NetShopChargeEvent = {
  id?: string;
  type: 'charge.paid' | 'charge.pending' | 'charge.failed';
  data: {
    id?: string;
    reference?: string;
    status?: NetShopChargeStatus;
    amount?: number;
    currency?: string;
    provider?: {
      transactionID?: string;
      thirdPartyReference?: string;
      responseCode?: string | null;
      responseDesc?: string | null;
    };
    failed_reason?: string | null;
  };
};

export function terminalChargeStatus(status: NetShopChargeStatus): boolean {
  return status === 'paid' || status === 'failed';
}

export function normalizeChargeStatus(status: string): 'SUCCESS' | 'PROCESSING' | 'FAILED' {
  if (status === 'paid') return 'SUCCESS';
  if (status === 'failed') return 'FAILED';
  return 'PROCESSING';
}
