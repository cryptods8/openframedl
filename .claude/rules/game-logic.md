---
paths:
  - "app/game/**"
  - "app/words/**"
  - "app/api/**/game*"
  - "app/api/**/guess*"
---

# Game Logic

- Word selection: seeded random shuffling (`seedrandom`) with `SHUFFLE_SECRET` and `SEED_SALT` env vars
- Daily games keyed by date string, custom games by `custom_<id>` prefix
- Guess validation: 5 chars, must be a valid word, hard mode rules enforced when enabled
- Game statuses: `IN_PROGRESS`, `WON`, `LOST` (max 6 guesses)
- `GameServiceImpl` in `game-service.ts` is the main orchestrator, exported as singleton `gameService`
