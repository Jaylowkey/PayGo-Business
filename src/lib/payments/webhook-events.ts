import { createHash } from 'node:crypto';
import { prisma } from '@/lib/db';
import type { WebhookEventStatus } from '@prisma/client';

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

export async function updateWebhookEventStatus(
  id: string,
  status: WebhookEventStatus,
  error?: string,
) {
  return prisma.webhookEvent.update({
    where: { id },
    data: {
      status,
      error: error?.slice(0, 2000),
      processedAt: status === 'PROCESSED' || status === 'FAILED' ? new Date() : undefined,
    },
  });
}
