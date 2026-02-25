---
paths:
  - "app/db/**"
  - "app/game/*-pg-repository*"
---

# Database Conventions

- Kysely query builder with CamelCasePlugin — use camelCase in TypeScript, the plugin maps to snake_case columns
- Database instance: `pgDb` exported from `app/db/pg/pg-db.ts`
- Schema types defined in `app/db/pg/types.ts`
- Key tables: `game`, `vGame` (view joining custom game + arena), `customGame`, `arena`, `reminder`, `userSettings`, `streakFreeze`
- Repositories are plain module exports (not classes) — follow existing patterns
