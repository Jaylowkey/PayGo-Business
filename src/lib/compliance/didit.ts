import { env } from '@/lib/env';
import type {
  ComplianceProvider,
  CreateVerificationSessionInput,
  VerificationDecision,
  VerificationSession,
  VerificationStatus,
} from './provider';

const DIDIT_BASE_URL = 'https://verification.didit.me';

function statusFromDidit(value: unknown): VerificationStatus {
  switch (String(value ?? '').toUpperCase()) {
    case 'APPROVED':
    case 'VERIFIED':
      return 'VERIFIED';
    case 'DECLINED':
    case 'REJECTED':
      return 'REJECTED';
    case 'IN_REVIEW':
    case 'PROCESSING':
      return 'IN_REVIEW';
    case 'EXPIRED':
      return 'EXPIRED';
    case 'REQUIRES_ACTION':
    case 'ACTION_REQUIRED':
      return 'ACTION_REQUIRED';
    default:
      return 'IN_REVIEW';
  }
}

async function diditRequest(path: string, init: RequestInit): Promise<Record<string, unknown>> {
  if (!env.DIDIT_API_KEY) throw new Error('DIDIT_NOT_CONFIGURED');

  const response = await fetch(`${DIDIT_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.DIDIT_API_KEY}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
  });

  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(`DIDIT_API_ERROR:${response.status}`);
  }
  return body;
}

export class DiditComplianceProvider implements ComplianceProvider {
  readonly name = 'didit';

  async createSession(input: CreateVerificationSessionInput): Promise<VerificationSession> {
    const workflowId = input.scope === 'KYC' ? env.DIDIT_KYC_WORKFLOW_ID : env.DIDIT_KYB_WORKFLOW_ID;
    if (!workflowId) throw new Error(`DIDIT_${input.scope}_WORKFLOW_NOT_CONFIGURED`);

    const body = await diditRequest('/v3/session/', {
      method: 'POST',
      body: JSON.stringify({
        workflow_id: workflowId,
        vendor_data: input.reference,
        callback: input.callbackUrl,
        metadata: input.metadata,
      }),
    });

    const sessionId = String(body.session_id ?? body.id ?? '');
    const url = String(body.url ?? body.verification_url ?? '');
    if (!sessionId || !url) throw new Error('DIDIT_INVALID_SESSION_RESPONSE');

    return { provider: this.name, sessionId, url, status: 'IN_REVIEW' };
  }

  async getDecision(sessionId: string): Promise<VerificationDecision> {
    const body = await diditRequest(`/v3/session/${encodeURIComponent(sessionId)}/decision/`, { method: 'GET' });
    const status = statusFromDidit(body.status ?? body.decision ?? body.result);
    return { sessionId, status, providerReference: typeof body.reference === 'string' ? body.reference : undefined, raw: body };
  }
}

export const diditComplianceProvider = new DiditComplianceProvider();
