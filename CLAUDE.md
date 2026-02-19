# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Framedl is a Wordle game built as a Farcaster Frame (interactive mini-app) using Next.js 14 and Frames.js. It supports daily games, custom word games, arenas (multiplayer), and a "PRO" variant gated by NFT pass ownership.

## Commands

- `yarn dev` - Start development server at http://localhost:3000
- `yarn build` - Build for production (Next.js)
- `yarn lint` - Run ESLint
- `yarn start` - Start production server
- Deploy: `vercel`

## Architecture

### Tech Stack
- **Framework**: Next.js 14 (App Router) with TypeScript
- **Database**: PostgreSQL via Kysely (query builder with CamelCasePlugin)
- **Legacy storage**: Upstash Redis (still used for migration path in `app/db/db.ts`)
- **Styling**: Tailwind CSS
- **Auth**: NextAuth.js + Farcaster auth-kit (Sign In with Farcaster)
- **State**: React Query (@tanstack/react-query)
- **Deployment**: Vercel

### Key Directories
- `app/game/` - Core game logic: `game-service.ts` (main service), `*-pg-repository.ts` (data access)
- `app/db/pg/` - Database setup (`pg-db.ts` exports `pgDb` Kysely instance) and types (`types.ts` defines all tables)
- `app/api/` - Next.js API routes (games, arenas, leaderboard, bot, admin, frames, etc.)
- `app/words/` - Word lists (answer words and all valid words)
- `app/image-ui/` - Server-side image generation components (for Frame OG images)
- `app/pro/` - PRO pass ownership logic
- `app/games/arena/` - Arena (multiplayer) game mode
- `app/ui/` - Shared UI components
- `app/contexts/` - React context providers

### Data Access Pattern
Repository pattern with PostgreSQL. Repositories are plain module exports (not classes):
- `game-pg-repository.ts` - Game CRUD, leaderboard queries
- `stats-pg-repository.ts` - User statistics
- `custom-game-pg-repository.ts` - Custom word games
- `arena-pg-repository.ts` - Arenas
- `streak-freeze-pg-repository.ts` - Streak freeze tracking

`GameServiceImpl` in `game-service.ts` is the main business logic class, orchestrating repositories. It's exported as a singleton `gameService`.

### Database Schema
Defined in `app/db/pg/types.ts` using Kysely types. Key tables: `game`, `vGame` (view with custom game + arena joins), `customGame`, `arena`, `reminder`, `userSettings`, `streakFreeze`.

### Identity Providers
Users are identified by `(userId, identityProvider)` pairs. Providers: `fc` (Farcaster), `xmtp`, `lens`, `anon`, `fc_unauth`.

**IMPORTANT**: Always use both `userId` AND `identityProvider` together when identifying a user. Different identity providers can share the same `userId`, so using `userId` alone can cause conflicts. This applies to all queries, nonce generation, cache keys, and any other user-scoped operations.

### Game Flow
1. Word selection uses seeded random shuffling (`seedrandom`) with `SHUFFLE_SECRET` and `SEED_SALT` env vars
2. Daily games keyed by date string, custom games by `custom_<id>` prefix
3. Guesses validated (5 chars, valid word, hard mode rules) then persisted
4. Game statuses: `IN_PROGRESS`, `WON`, `LOST` (max 6 guesses)

### Environment Variables
Key vars (see `.env.sample`): `NEXT_PUBLIC_HOST`, `PG_CONNECTION_STRING`, `REDIS_API_URL`, `REDIS_API_TOKEN`, `SEED_SALT`, `SHUFFLE_SECRET`, `NEYNAR_API_KEY`, `FRAMEDL_PRO` (set to "true" for PRO mode).
