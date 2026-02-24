import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    CREATE TABLE streak_freeze_mint (
      id serial PRIMARY KEY,
      user_id text NOT NULL,
      identity_provider identity_provider_type NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      source text NOT NULL,
      earned_at_streak_length integer,
      earned_at_game_key text,
      purchase_tx_ref text,
      mint_tx_hash text,
      token_id text,
      claim_nonce text,
      claim_signature text,
      claim_tx_hash text,
      wallet_address text
    )
  `.execute(db);

  await sql`
    CREATE TABLE streak_freeze_applied (
      id serial PRIMARY KEY,
      user_id text NOT NULL,
      identity_provider identity_provider_type NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      applied_to_game_key text NOT NULL,
      applied_at timestamptz NOT NULL,
      burn_tx_hash text
    )
  `.execute(db);

  // Indexes
  await sql`CREATE INDEX idx_streak_freeze_mint_user ON streak_freeze_mint (user_id, identity_provider, source)`.execute(
    db,
  );
  await sql`CREATE UNIQUE INDEX idx_streak_freeze_applied_user_game ON streak_freeze_applied (user_id, identity_provider, applied_to_game_key)`.execute(
    db,
  );
}

export async function down(db: Kysely<any>): Promise<void> {
  // Drop tables
  await sql`DROP TABLE IF EXISTS streak_freeze_applied`.execute(db);
  await sql`DROP TABLE IF EXISTS streak_freeze_mint`.execute(db);
}
