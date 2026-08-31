import { randomUUID } from "node:crypto";
import { requireNetShopConfig } from "@/lib/env";

export type NetShopPayoutMethod = "mpesa" | "emola";

export interface NetShopPayoutInput {
  amount: number;
  method: NetShopPayoutMethod;
  msisdn: string;
  reference: string;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
}

export interface NetShopPayoutResponse {
  id: string;
  status: "completed" | "pending" | "failed";
  amount: number;
  currency: string;
  method: NetShopPayoutMethod;
  fees?: { our?: number; provider?: number };
  net?: number;
  reference: string;
  provider?: {
    transactionID?: string;
    thirdPartyReference?: string;
    responseCode?: string;
    responseDesc?: string;
  };
  failed_reason?: string | null;
}

export async function createNetShopPayout(input: NetShopPayoutInput) {
  const config = requireNetShopConfig();
  const idempotencyKey = input.idempotencyKey ?? randomUUID();

  const response = await fetch(`${config.baseUrl}/payouts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "X-Wallet-ID": config.walletId,
      "Idempotency-Key": idempotencyKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: input.amount,
      currency: "MZN",
      method: input.method,
      msisdn: input.msisdn,
      reference: input.reference,
      metadata: input.metadata ?? {},
    }),
    cache: "no-store",
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(
      payload?.message || payload?.error || `NETSHOP_PAYOUT_HTTP_${response.status}`,
    ) as Error & { status?: number; payload?: unknown };
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return {
    idempotencyKey,
    payload: payload as NetShopPayoutResponse,
  };
}

export async function getNetShopPayout(idOrReference: string) {
  const config = requireNetShopConfig();
  const response = await fetch(
    `${config.baseUrl}/payouts/${encodeURIComponent(idOrReference)}`,
    {
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "X-Wallet-ID": config.walletId,
      },
      cache: "no-store",
    },
  );

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(
      payload?.message || payload?.error || `NETSHOP_PAYOUT_HTTP_${response.status}`,
    ) as Error & { status?: number; payload?: unknown };
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload as NetShopPayoutResponse;
}
