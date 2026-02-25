---
paths:
  - "app/game/**"
  - "app/api/**"
  - "app/db/**"
---

# User Identity

Users are identified by `(userId, identityProvider)` pairs. Providers: `fc` (Farcaster), `xmtp`, `lens`, `anon`, `fc_unauth`.

**YOU MUST** use both `userId` AND `identityProvider` together in:
- All database queries and WHERE clauses
- Nonce generation
- Cache keys
- Any user-scoped operation

Using `userId` alone WILL cause cross-provider conflicts.
