import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { parseNetShopWebhook, verifyNetShopSignature } from '@/lib/payments/netshop-webhook';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get('X-NetShop-Signature') ?? '';

  if (!verifyNetShopSignature(rawBody, signature, env.NETSHOP_WEBHOOK_SECRET)) {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 });
  }

  try {
    const event = parseNetShopWebhook(rawBody);

    // Persistence and settlement are deliberately handled after signature
    // verification. Unknown event types are acknowledged safely so NetShop
    // does not retry events the PayGo application does not consume yet.
    switch (event.type) {
      case 'charge.paid':
      case 'charge.failed':
      case 'charge.pending':
      case 'refund.created':
      case 'payout.completed':
      case 'payout.failed':
      case 'dispute.opened':
      case 'subscription.renewed':
        return NextResponse.json({ received: true });
      default:
        return NextResponse.json({ received: true, ignored: true });
    }
  } catch {
    return NextResponse.json({ error: 'invalid_webhook' }, { status: 400 });
  }
}
