import { createHmac, timingSafeEqual } from 'node:crypto';

export function signWebhook(payload: string, secret: string, timestamp: string): string {
  return createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex');
}

export function verifyWebhookSignature(payload: string, secret: string, timestamp: string, signature: string): boolean {
  const expected = signWebhook(payload, secret, timestamp);
  const actual = Buffer.from(signature, 'utf8');
  const expectedBuffer = Buffer.from(expected, 'utf8');
  return actual.length === expectedBuffer.length && timingSafeEqual(actual, expectedBuffer);
}
