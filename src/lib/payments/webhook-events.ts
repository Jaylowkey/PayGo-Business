import { createHash } from 'node:crypto';
import { prisma } from '@/lib/db';

export function webhookEventKey(rawBody: string, eventId?: string): string {
  if (eventId?.trim()) return `netshop:${eventId.trim()}`;
  return `netshop:body:${createHash('sha256').update(rawBody, 'utf8').digest('hex')}`;
}

export async function claimWebhookEvent(key: string, type: string, payload: object) {
  try {
    return await prisma.webhookEvent.create({
      data: {
        provider: 'netshop',
        eventKey: key,
        eventType: type,
        payload: payload as never,
        status: 'RECEIVED',
      },
    });
  } catch (error) {
    if ((error as { code?: string }).code === 'P2002') return null;
    throw error;
  }
}
