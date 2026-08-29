import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { env } from '@/lib/env';

export const runtime = 'nodejs';

function validSignature(rawBody: string, signature: string | null): boolean {
  if (!env.DIDIT_WEBHOOK_SECRET || !signature) return false;
  const expected = createHmac('sha256', env.DIDIT_WEBHOOK_SECRET).update(rawBody).digest('hex');
  const actual = Buffer.from(signature, 'utf8');
  const expectedBuffer = Buffer.from(expected, 'utf8');
  return actual.length === expectedBuffer.length && timingSafeEqual(actual, expectedBuffer);
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-signature-v2') ?? request.headers.get('x-signature');

  if (!validSignature(rawBody, signature)) {
    return NextResponse.json({ success: false, code: 'INVALID_WEBHOOK_SIGNATURE' }, { status: 401 });
  }

  const event = JSON.parse(rawBody) as Record<string, unknown>;
  const eventId = typeof event.event_id === 'string' ? event.event_id : null;
  if (!eventId) {
    return NextResponse.json({ success: false, code: 'MISSING_EVENT_ID' }, { status: 400 });
  }

  // Persistence and idempotent event application are deliberately kept in the
  // compliance service layer; never trust a webhook to mutate financial state directly.
  return NextResponse.json({ success: true, received: true, eventId });
}
