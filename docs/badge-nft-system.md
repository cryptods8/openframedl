# Badge NFT System

DB-backed achievement badges with on-chain minting for Framedl.

## Overview

Badges are materialized into the `badge` DB table when a game completes. Each badge has a stable UUID, personalized image, and can be minted as an ERC1155 NFT on Base with server-signature authorization.

---

## Database

### Migration (`migrations/004_badges.ts`)

Creates the `badge` table:

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK, auto-generated |
| `user_id` | text | |
| `identity_provider` | enum | |
| `category` | text | wins, streaks, fourdle, wordone |
| `milestone` | integer | e.g. 100 |
| `tier` | text | bronze, silver, gold, platinum, diamond |
| `earned_at` | timestamptz | defaults to now() |
| `username` | text | denormalized for image personalization |
| `minted` | boolean | default false |
| `mint_tx_hash` | text | |
| `token_id` | text | |

Unique constraint on `(user_id, identity_provider, category, milestone)`.

### Repository (`app/game/badge-pg-repository.ts`)

- `findByUserKey(userKey)` — all badges for a user
- `findByUserKeyAndCategory(userKey, category)` — badges in one category
- `findById(id)` — single badge by UUID
- `insertIfNotExists(badge)` — upsert via `ON CONFLICT DO NOTHING`
- `updateMintInfo(id, { mintTxHash, tokenId })` — after NFT mint
- `materializeBadges(userKey, stats, username)` — computes milestones from stats, bulk-inserts newly earned ones

---

## Game Service Integration

In `app/game/game-service.ts`, after any daily game completion (win or loss):

```typescript
if (isGameFinished && game.isDaily) {
  if (updatedGame.status === "WON") {
    await this.checkAndAwardFreezes(guessedGame);
  }
  await this.materializeBadges(guessedGame);
}
```

The `materializeBadges` method loads stats and calls `badgeRepo.materializeBadges()`.

---

## Smart Contract (`contracts/BadgeNFT.sol`)

ERC1155 where each badge is a unique token (auto-incrementing `tokenId`).

### Key Functions

| Function | Description |
|----------|-------------|
| `mintBadge(to, badgeId, nonce, signature)` | Signature-gated mint, costs `mintPrice` ETH |
| `setSigner(address)` | Owner sets the authorized signer |
| `setMintPrice(uint256)` | Owner sets mint price |
| `setRoyalty(address, uint96)` | Owner sets ERC-2981 royalty (max 10%) |
| `withdraw()` | Owner withdraws collected ETH |

### Signature Scheme

1. Server builds nonce: `keccak256(abi.encodePacked("badge-mint", badgeId))`
2. Server signs: `keccak256(abi.encodePacked(to, badgeId, nonce, contractAddress))`
3. Contract verifies signature matches stored `signer` address
4. Nonce is marked used to prevent replay

### Deploy

```bash
BADGE_NFT_URI="https://your-domain.com/api/nfts/badges/{id}" \
BADGE_NFT_MINT_PRICE=100000000000000 \
BADGE_NFT_SIGNER=0xYourSignerAddress \
forge script scripts/DeployBadgeNFT.s.sol --broadcast --rpc-url $RPC_URL
```

---

## Contract Helper Library (`app/lib/badge-nft-contract.ts`)

Server-side signing + shared ABI/config:

- `buildBadgeMintNonce(badgeId)` — deterministic nonce from badge UUID
- `signBadgeMint(toAddress, badgeId)` — server signs the mint authorization
- `verifyBadgeMintTx(txHash, recipient, badgeId)` — verifies on-chain, extracts tokenId
- Exports: `BADGE_NFT_ABI`, `BADGE_NFT_CONTRACT_ADDRESS`, `BADGE_NFT_CHAIN_ID`

---

## API Endpoints

### `GET /api/badges/mint?badgeId=<uuid>&walletAddress=<0x...>`

Returns `{ badgeId, nonce, signature }` for minting. Verifies:
- User is authenticated
- Badge exists and belongs to user
- Badge not already minted

### `POST /api/badges/mint`

Body: `{ badgeId, mintTxHash, walletAddress }`

Verifies on-chain tx, marks badge as minted in DB. Returns `{ success, tokenId }`.

### `GET /api/nfts/badges/[id]`

NFT metadata endpoint (by badge UUID). Returns name, description, personalized image URL, and attributes (category, milestone, tier, player, earned date).

### `GET /api/images/badge?cat=...&value=...&username=...`

Badge image generation. Optional `username` param for personalized images (used in sharing/NFT metadata). Without username, serves a generic cached image (used in profile grid).

---

## Frontend

### Mint Button (`app/ui/mint-badge-button.tsx`)

Client component using wagmi hooks:
1. Connects wallet / switches chain
2. Fetches signature from `GET /api/badges/mint`
3. Calls `mintBadge()` on contract with ETH payment
4. After tx confirms, calls `POST /api/badges/mint` to record

### Badge Page (`app/app/badges/[...params]/page.tsx`)

Catch-all route handling:
- `/app/badges/<uuid>` — DB badge with personalized info + mint button (if owner)
- `/app/badges/<cat>/<value>` — legacy computed badge (backward compat)

### Profile Badges (`app/app/profile/profile-badges.tsx`)

Loads badges from DB + computes teasers from stats. Links earned badges to UUID routes when DB badges are available.

---

## Backfill

One-time script: `scripts/backfill-badges.ts`

```bash
npx tsx scripts/backfill-badges.ts
```

Materializes badges for all existing users. Approximates `earned_at` from the Nth winning game's `completedAt` for wins/fourdle/wordone milestones.

---

## Environment Variables

```
# Badge NFT Contract
NEXT_PUBLIC_BADGE_NFT_CA=0x...          # Deployed contract address
NEXT_PUBLIC_BADGE_NFT_CHAIN_ID=8453     # Base mainnet (or 84532 for testnet)
BADGE_NFT_SIGNER_PK=0x...              # Private key for signing mints
```

---

## Files Changed

| File | Change |
|------|--------|
| `migrations/004_badges.ts` | New — badge table migration |
| `app/db/pg/types.ts` | Added `BadgeTable`, updated `Database` |
| `app/game/badge-pg-repository.ts` | New — badge CRUD + materialization |
| `app/game/game-service.ts` | Added `materializeBadges` hook after game completion |
| `contracts/BadgeNFT.sol` | New — ERC1155 badge contract |
| `scripts/DeployBadgeNFT.s.sol` | New — Forge deploy script |
| `app/lib/badge-nft-contract.ts` | New — signing, ABI, config |
| `app/api/badges/mint/route.ts` | New — sign + confirm mint API |
| `app/ui/mint-badge-button.tsx` | New — mint button component |
| `app/app/badges/[...params]/page.tsx` | New — catch-all badge page (UUID + legacy) |
| `app/app/badges/[...params]/badge-page-client.tsx` | New — share + mint client |
| `app/api/nfts/badges/[id]/route.ts` | New — NFT metadata by badge UUID |
| `app/api/images/badge/route.tsx` | Added optional `username` personalization |
| `app/app/profile/page.tsx` | Loads badges from DB |
| `app/app/profile/profile-badges.tsx` | Accepts DB badges + computed teasers |
| `app/lib/badges.ts` | `getBadgeImageUrl` accepts optional username |
| `scripts/backfill-badges.ts` | New — one-time backfill |
