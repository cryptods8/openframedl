# CLAUDE.md

Framedl is a Wordle game built as a Farcaster Frame (interactive mini-app) using Next.js 14 and Frames.js. It supports daily games, custom word games, arenas (multiplayer), and a "PRO" variant gated by NFT pass ownership.

## Commands

- `yarn dev` - Start development server
- `yarn build` - Build for production
- `yarn lint` - Run ESLint
- Deploy: `vercel`

## Tech Stack

- Next.js 14 (App Router), TypeScript, Tailwind CSS
- PostgreSQL via Kysely (CamelCasePlugin) — schema in `app/db/pg/types.ts`
- Legacy: Upstash Redis (migration path in `app/db/db.ts`)
- Auth: NextAuth.js + Farcaster auth-kit
- State: React Query (@tanstack/react-query)

## Critical Rules

**IMPORTANT**: Always use both `userId` AND `identityProvider` together when identifying a user. Different identity providers can share the same `userId`, so using `userId` alone causes conflicts. This applies to all queries, nonce generation, cache keys, and any user-scoped operations.

## Architecture

- Repository pattern: plain module exports (not classes) in `app/game/*-pg-repository.ts`
- `GameServiceImpl` in `app/game/game-service.ts` orchestrates repositories, exported as singleton `gameService`
- Environment variables documented in `.env.sample`
