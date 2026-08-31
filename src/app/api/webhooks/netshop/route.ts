import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { prisma } from '@/lib/db';
import { parseNetShopWebhook, verifyNetShopSignature } from '@/lib/payments/netshop-webhook';
import { claimWebhookEvent, updateWebhookEventStatus, webhookEventKey } from '@/lib/payments/webhook-events';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get('X-NetShop-Signature') ?? '';

  if (!verifyNetShopSignature(rawBody, signature, env.NETSHOP_WEBHOOK_SECRET ?? '')) {
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

    if (event.type === 'payout.completed' || event.type === 'payout.failed') {
      const data = event.data as Record<string, any>;
      const providerPayoutId = String(data.id ?? data.payout_id ?? data.payout?.id ?? '').trim();
      const reference = String(data.reference ?? data.payout?.reference ?? '').trim();

      if (!providerPayoutId && !reference) {
        await updateWebhookEventStatus(claimed.id, 'FAILED', 'PAYOUT_IDENTIFIER_MISSING');
        return NextResponse.json({ error: 'payout_identifier_missing' }, { status: 400 });
      }

      const payout = await prisma.payout.findFirst({
        where: {
          OR: [
            ...(providerPayoutId ? [{ providerPayoutId }] : []),
            ...(reference ? [{ reference }] : []),
          ],
        },
      });

      if (payout) {
        const feeOur = typeof data.fees?.our === 'number' ? data.fees.our : 0;
        const feeProvider = typeof data.fees?.provider === 'number' ? data.fees.provider : 0;
        await prisma.payout.update({
          where: { id: payout.id },
          data: {
            status: event.type === 'payout.completed' ? 'SUCCESS' : 'FAILED',
            providerPayoutId: providerPayoutId || payout.providerPayoutId,
            feeMinor: BigInt(Math.round((feeOur + feeProvider) * 100)),
            destination: {
              ...(typeof payout.destination === 'object' && payout.destination !== null ? payout.destination : {}),
              providerStatus: data.status ?? null,
              providerTransactionId: data.provider?.transactionID ?? null,
              failed_reason: data.failed_reason ?? null,
              providerNet: data.net ?? null,
            },
          },
        });
      }
    }

    await updateWebhookEventStatus(claimed.id, 'PROCESSED');

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
  } catch (error) {
    console.error('[webhooks/netshop]', error);
    return NextResponse.json({ error: 'invalid_webhook' }, { status: 400 });
  }
}
