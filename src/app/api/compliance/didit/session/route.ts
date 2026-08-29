import { NextResponse } from 'next/server';
import { z } from 'zod';
import { diditComplianceProvider } from '@/lib/compliance/didit';

export const runtime = 'nodejs';

const schema = z.object({
  scope: z.enum(['KYC', 'KYB']),
  reference: z.string().min(1).max(128),
  callbackUrl: z.string().url().optional(),
  metadata: z.record(z.string(), z.string()).optional(),
});

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const session = await diditComplianceProvider.createSession(input);
    return NextResponse.json({ success: true, session });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create verification session.';
    const status = message.startsWith('DIDIT_') ? 503 : 400;
    return NextResponse.json({ success: false, code: message }, { status });
  }
}
