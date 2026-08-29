import { randomUUID } from 'node:crypto';

export function financialReference(prefix: 'PG' | 'PO' | 'LT' | 'FE'): string {
  return `${prefix}_${randomUUID().replaceAll('-', '').slice(0, 24).toUpperCase()}`;
}
