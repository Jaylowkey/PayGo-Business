# PayGo Business access policy

## Individual

Individuals can use the core payment experience: overview, payments, wallet, payouts, customers, payment links, QR, notifications, KYC, reports and personal settings.

Business-only capabilities are intentionally unavailable to individual accounts. These include organization team management, KYB, developer tools, API keys, webhooks, marketing and advanced invoicing.

## Business

Business accounts can access the full merchant platform subject to verification, organization membership and role permissions.

### Roles

- OWNER: full organization access.
- ADMIN: operational administration.
- FINANCE: financial operations, customers, invoices, payouts and reports.
- DEVELOPER: API, API keys and webhooks.
- SUPPORT: customer and payment support views.
- VIEWER: read-only operational visibility.

## Enforcement

Access control must be enforced server-side in route handlers, server actions and service-layer operations. Hiding navigation items is only a UX optimization and is never a security boundary.

Sensitive operations should additionally require the relevant verification state, ownership/role, and step-up authentication where risk warrants it.
