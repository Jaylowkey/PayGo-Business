import { NextResponse } from 'next/server';
import { createPaymentSchema } from '@/lib/validation/payment';
import { requireIdempotencyKey } from '@/lib/security/idempotency';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const idempotencyKey = request.headers.get('Idempotency-Key');

  try {
    requireIdempotencyKey(idempotencyKey);
    const body = await request.json();
    const input = createPaymentSchema.parse(body);

    // Provider execution is intentionally isolated from the HTTP layer.
    // The Netshop adapter will be wired here once production credentials are configured.
    return NextResponse.json({
      success: false,
      code: 'PAYMENT_PROVIDER_NOT_CONFIGURED',
      message: 'Payment provider is not configured for this environment.',
      request: {
        amount: input.amount,
        currency: input.currency,
      },
    }, { status: 503 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid request.';
    return NextResponse.json({ success: false, code: 'INVALID_REQUEST', message }, { status: 400 });
  }
}
