import { createHmac, timingSafeEqual } from 'node:crypto';

export type NetShopWebhookEvent = {
  id?: string;
  type: string;
  data: Record<string, unknown>;
  created_at?: string;
};

function hexHmac(secret: string, rawBody: string): string {
  return createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
}

export function verifyNetShopSignature(rawBody: string, signature: string, secret: string): boolean {
  if (!rawBody || !signature || !secret) return false;
  const expected = hexHmac(secret, rawBody);
  const received = signature.trim().replace(/^sha256=/i, '');
  const expectedBuffer = Buffer.from(expected, 'utf8');
  const receivedBuffer = Buffer.from(received, 'utf8');
  if (expectedBuffer.length !== receivedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

export function parseNetShopWebhook(rawBody: string): NetShopWebhookEvent {
  const parsed = JSON.parse(rawBody) as NetShopWebhookEvent;
  if (!parsed || typeof parsed !== 'object' || typeof parsed.type !== 'string') {
    throw new Error('NETSHOP_INVALID_WEBHOOK');
  }
  if (!parsed.data || typeof parsed.data !== 'object') {
    throw new Error('NETSHOP_WEBHOOK_DATA_REQUIRED');
  }
  return parsed;
}

export function isPaymentEvent(type: string): boolean {
  return type === 'charge.paid' || type === 'charge.failed' || type === 'charge.pending';
}
