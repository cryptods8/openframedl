import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    CREATE TABLE badge (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id text NOT NULL,
      identity_provider identity_provider_type NOT NULL,
      category text NOT NULL,
      milestone integer NOT NULL,
      tier text NOT NULL,
      earned_at timestamptz NOT NULL DEFAULT now(),
      username text,
      minted boolean NOT NULL DEFAULT false,
      mint_tx_hash text,
      token_id text,
      UNIQUE(user_id, identity_provider, category, milestone)
    )
  `.execute(db);

  await sql`
    CREATE INDEX idx_badge_user ON badge (user_id, identity_provider)
  `.execute(db);

  await sql`
    CREATE INDEX idx_badge_category ON badge (user_id, identity_provider, category)
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP TABLE IF EXISTS badge`.execute(db);
}
