import { env } from '@/lib/env';

export type NetShopCharge = {
  id: string;
  status: 'paid' | 'pending' | 'failed';
  amount: number;
  currency: string;
  reference?: string;
  fee?: number;
  net?: number;
  provider?: Record<string, unknown>;
  failed_reason?: string | null;
};

export async function getNetShopCharge(idOrReference: string): Promise<NetShopCharge> {
  const response = await fetch(`${env.NETSHOP_API_BASE_URL}/charges/${encodeURIComponent(idOrReference)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${env.NETSHOP_API_KEY}`,
      'X-Wallet-ID': env.NETSHOP_WALLET_ID,
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`NETSHOP_CHARGE_LOOKUP_FAILED:${response.status}:${body.slice(0, 500)}`);
  }

  return response.json() as Promise<NetShopCharge>;
}
