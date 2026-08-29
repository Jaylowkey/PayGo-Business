export type ComplianceKind = 'KYC' | 'KYB';

export type VerificationStatus =
  | 'NOT_STARTED'
  | 'IN_REVIEW'
  | 'ACTION_REQUIRED'
  | 'VERIFIED'
  | 'REJECTED'
  | 'EXPIRED';

export type ComplianceSession = {
  sessionId: string;
  verificationUrl: string;
  kind: ComplianceKind;
  status: VerificationStatus;
};

export type DiditWebhookEvent = {
  event_id: string;
  session_id: string;
  event_type: string;
  status?: string;
  timestamp?: string;
  data?: Record<string, unknown>;
};
