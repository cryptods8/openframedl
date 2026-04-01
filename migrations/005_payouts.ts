import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    CREATE TYPE payout_status AS ENUM ('pending', 'processing', 'completed', 'failed')
  `.execute(db);

  await sql`
    CREATE TABLE payout (
      id bigserial PRIMARY KEY,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      date text NOT NULL,
      identity_provider identity_provider_type NOT NULL,
      status payout_status NOT NULL DEFAULT 'pending',
      prize integer NOT NULL,
      pi_bonus integer NOT NULL,
      days integer,
      recipients jsonb NOT NULL DEFAULT '[]',
      drops jsonb NOT NULL DEFAULT '[]',
      error text,
      UNIQUE(date, identity_provider)
    )
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP TABLE IF EXISTS payout`.execute(db);
  await sql`DROP TYPE IF EXISTS payout_status`.execute(db);
}
