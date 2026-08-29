import { createHash } from 'node:crypto';

export function fingerprintRequest(input: unknown): string {
  const serialized = JSON.stringify(input, Object.keys((input ?? {}) as object).sort());
  return createHash('sha256').update(serialized).digest('hex');
}

export function requireIdempotencyKey(value: string | null | undefined): string {
  if (!value || value.length < 16 || value.length > 128) {
    throw new Error('A valid Idempotency-Key header is required.');
  }
  return value;
}
