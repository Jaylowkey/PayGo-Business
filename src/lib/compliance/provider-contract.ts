import type { ComplianceKind, ComplianceSession, VerificationStatus } from './didit/types';

export type CreateVerificationInput = {
  reference: string;
  kind: ComplianceKind;
  callbackUrl?: string;
  metadata?: Record<string, string>;
};

export interface ComplianceProvider {
  readonly name: string;
  createSession(input: CreateVerificationInput): Promise<ComplianceSession>;
  getSession(sessionId: string): Promise<ComplianceSession>;
  mapStatus(providerStatus: string): VerificationStatus;
}
