import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    CREATE TYPE notification_type AS ENUM ('daily_reminder', 'arena_new', 'streak_freeze_earned')
  `.execute(db);

  await sql`
    CREATE TYPE notification_channel AS ENUM ('frame', 'direct_cast')
  `.execute(db);

  await sql`
    CREATE TYPE notification_status AS ENUM ('pending', 'processing', 'sent', 'stale', 'failed', 'rate_limited')
  `.execute(db);

  await sql`
    CREATE TABLE notification_queue (
      id bigserial PRIMARY KEY,
      created_at timestamptz NOT NULL DEFAULT now(),
      scheduled_at timestamptz NOT NULL DEFAULT now(),
      processed_at timestamptz,
      user_id text NOT NULL,
      identity_provider identity_provider_type NOT NULL,
      type notification_type NOT NULL,
      channel notification_channel NOT NULL,
      status notification_status NOT NULL DEFAULT 'pending',
      payload jsonb NOT NULL DEFAULT '{}',
      group_key text,
      ref_id text,
      attempts int NOT NULL DEFAULT 0,
      max_attempts int NOT NULL DEFAULT 3,
      last_error text,
      locked_by text,
      locked_at timestamptz
    )
  `.execute(db);

  await sql`
    CREATE INDEX idx_nq_pending ON notification_queue (scheduled_at, status)
      WHERE status IN ('pending', 'rate_limited')
  `.execute(db);

  await sql`
    CREATE UNIQUE INDEX idx_nq_dedup ON notification_queue (user_id, identity_provider, type, channel, ref_id)
      WHERE status IN ('pending', 'processing', 'rate_limited')
  `.execute(db);

  await sql`
    CREATE INDEX idx_nq_group ON notification_queue (group_key, status)
      WHERE group_key IS NOT NULL AND status = 'pending'
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP TABLE IF EXISTS notification_queue`.execute(db);
  await sql`DROP TYPE IF EXISTS notification_status`.execute(db);
  await sql`DROP TYPE IF EXISTS notification_channel`.execute(db);
  await sql`DROP TYPE IF EXISTS notification_type`.execute(db);
}
