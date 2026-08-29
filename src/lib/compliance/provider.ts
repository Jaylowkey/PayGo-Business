export type ComplianceScope = 'KYC' | 'KYB';
export type VerificationStatus = 'NOT_STARTED' | 'IN_REVIEW' | 'ACTION_REQUIRED' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';

export type CreateVerificationSessionInput = {
  scope: ComplianceScope;
  reference: string;
  callbackUrl?: string;
  metadata?: Record<string, string>;
};

export type VerificationSession = {
  provider: string;
  sessionId: string;
  url: string;
  status: VerificationStatus;
};

export type VerificationDecision = {
  sessionId: string;
  status: VerificationStatus;
  providerReference?: string;
  riskScore?: number;
  raw?: unknown;
};

export interface ComplianceProvider {
  readonly name: string;
  createSession(input: CreateVerificationSessionInput): Promise<VerificationSession>;
  getDecision(sessionId: string): Promise<VerificationDecision>;
}
