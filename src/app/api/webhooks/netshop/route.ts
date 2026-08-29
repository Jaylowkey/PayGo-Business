import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { parseNetShopWebhook, verifyNetShopSignature } from '@/lib/payments/netshop-webhook';
import { claimWebhookEvent, webhookEventKey } from '@/lib/payments/webhook-events';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get('X-NetShop-Signature') ?? '';

  if (!verifyNetShopSignature(rawBody, signature, env.NETSHOP_WEBHOOK_SECRET)) {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 });
  }

  try {
    const event = parseNetShopWebhook(rawBody);
    const claimed = await claimWebhookEvent(
      webhookEventKey(rawBody, event.id),
      event.type,
      event.data,
    );

    if (!claimed) return NextResponse.json({ received: true, duplicate: true });

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
