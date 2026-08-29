import { env } from '@/lib/env';
import type { ComplianceKind, ComplianceSession } from './types';
import { mapDiditStatus } from './status';

const DIDIT_API = 'https://verification.didit.me/v3';

function requireConfig() {
  if (!env.DIDIT_API_KEY) throw new Error('DIDIT_API_KEY_NOT_CONFIGURED');
}

export async function createDiditSession(input: {
  reference: string;
  kind: ComplianceKind;
  callbackUrl?: string;
  metadata?: Record<string, string>;
}): Promise<ComplianceSession> {
  requireConfig();
  const workflowId = input.kind === 'KYC' ? env.DIDIT_KYC_WORKFLOW_ID : env.DIDIT_KYB_WORKFLOW_ID;
  if (!workflowId) throw new Error(`DIDIT_${input.kind}_WORKFLOW_NOT_CONFIGURED`);

  const response = await fetch(`${DIDIT_API}/session/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.DIDIT_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      workflow_id: workflowId,
      vendor_data: input.reference,
      callback: input.callbackUrl,
      metadata: input.metadata,
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`DIDIT_SESSION_CREATE_FAILED:${response.status}`);
  }

  const data = await response.json() as Record<string, unknown>;
  const sessionId = String(data.session_id ?? '');
  const verificationUrl = String(data.url ?? data.verification_url ?? '');
  if (!sessionId || !verificationUrl) throw new Error('DIDIT_INVALID_SESSION_RESPONSE');

  return {
    sessionId,
    verificationUrl,
    kind: input.kind,
    status: mapDiditStatus(String(data.status ?? 'pending')),
  };
}
