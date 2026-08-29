# PayGo Business application services

This directory contains production domain boundaries for payments, finance, validation and security.

## Design rules

- Payment providers are adapters behind `PaymentProvider`.
- No provider secret is exposed to client components.
- Money is represented as integer minor units at persistence boundaries.
- Payment creation requires idempotency.
- Provider webhooks must be signed and replay-protected before changing financial state.
- Business and individual verification are separate compliance workflows.
