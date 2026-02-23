import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  // Enums
  await sql`CREATE TYPE identity_provider_type AS ENUM ('xmtp', 'fc', 'lens', 'fc_unauth', 'anon')`.execute(
    db,
  );
  await sql`CREATE TYPE game_status_type AS ENUM ('WON', 'LOST', 'IN_PROGRESS')`.execute(
    db,
  );

  // Tables
  await sql`
    CREATE TABLE game (
      id varchar(255) NOT NULL PRIMARY KEY,
      user_id varchar(255) NOT NULL,
      identity_provider identity_provider_type,
      game_key varchar(255) NOT NULL,
      is_daily boolean NOT NULL,
      word varchar(10) NOT NULL,
      guesses jsonb NOT NULL,
      created_at timestamptz NOT NULL,
      updated_at timestamptz NOT NULL,
      completed_at timestamptz,
      status game_status_type NOT NULL DEFAULT 'IN_PROGRESS',
      guess_count integer NOT NULL DEFAULT 0,
      is_hard_mode boolean NOT NULL DEFAULT false,
      user_data jsonb,
      src_game_id varchar(255),
      arena_id integer,
      arena_word_index smallint,
      game_data jsonb,
      is_hard_mode_required boolean
    )
  `.execute(db);

  await sql`
    CREATE TABLE custom_game (
      id varchar(255) NOT NULL PRIMARY KEY,
      user_id varchar(255) NOT NULL,
      identity_provider identity_provider_type,
      word varchar(10) NOT NULL,
      created_at varchar(40) NOT NULL,
      user_data jsonb,
      is_art boolean
    )
  `.execute(db);

  await sql`
    CREATE TABLE arena (
      id serial PRIMARY KEY,
      user_id varchar(255) NOT NULL,
      identity_provider identity_provider_type NOT NULL,
      created_at timestamptz NOT NULL,
      updated_at timestamptz NOT NULL,
      deleted_at timestamptz,
      user_data jsonb NOT NULL,
      config jsonb NOT NULL,
      members jsonb NOT NULL,
      started_at timestamptz,
      last_notified_at timestamptz
    )
  `.execute(db);

  await sql`
    CREATE TABLE reminder (
      id serial PRIMARY KEY,
      user_id varchar(255) NOT NULL,
      identity_provider identity_provider_type NOT NULL,
      created_at timestamptz NOT NULL,
      updated_at timestamptz NOT NULL,
      secret varchar(40) NOT NULL,
      enabled_at timestamptz,
      last_sent_at timestamptz,
      log jsonb NOT NULL
    )
  `.execute(db);

  await sql`
    CREATE TABLE user_settings (
      id serial PRIMARY KEY,
      user_id varchar(255) NOT NULL,
      identity_provider identity_provider_type NOT NULL,
      created_at timestamptz NOT NULL,
      updated_at timestamptz NOT NULL,
      notifications_enabled boolean NOT NULL,
      notification_details jsonb,
      data jsonb
    )
  `.execute(db);

  await sql`
    CREATE TABLE championship_signup (
      id serial PRIMARY KEY,
      user_id varchar(255) NOT NULL,
      identity_provider identity_provider_type NOT NULL,
      created_at timestamptz NOT NULL,
      updated_at timestamptz NOT NULL,
      deleted_at timestamptz,
      round_number smallint NOT NULL,
      user_data jsonb NOT NULL,
      src_id bigint,
      has_ticket boolean
    )
  `.execute(db);

  // Views
  await sql`
    CREATE VIEW v_custom_game AS
    SELECT
      id,
      user_id,
      identity_provider,
      word,
      created_at,
      user_data,
      is_art,
      row_number() OVER (PARTITION BY user_id, identity_provider ORDER BY created_at) AS num_by_user
    FROM custom_game
  `.execute(db);

  await sql`
    CREATE VIEW v_game AS
    SELECT
      g.id,
      g.user_id,
      g.identity_provider,
      g.game_key,
      g.is_daily,
      g.word,
      g.guesses,
      g.created_at,
      g.updated_at,
      g.completed_at,
      g.status,
      g.guess_count,
      g.is_hard_mode,
      g.user_data,
      g.src_game_id,
      g.arena_id,
      g.arena_word_index,
      g.game_data,
      g.is_hard_mode_required,
      cg.user_id AS custom_user_id,
      cg.identity_provider AS custom_identity_provider,
      cg.num_by_user AS custom_num_by_user,
      cg.user_data AS custom_user_data,
      cg.is_art AS custom_is_art
    FROM game g
    LEFT JOIN v_custom_game cg ON (
      NOT g.is_daily
      AND g.game_key LIKE 'custom_%'
      AND substr(g.game_key, 8) = cg.id
    )
  `.execute(db);

  // Indexes
  await sql`CREATE INDEX idx_user_key ON game (user_id, identity_provider)`.execute(
    db,
  );
  await sql`CREATE INDEX idx_user_game_key ON game (user_id, identity_provider, game_key, is_daily)`.execute(
    db,
  );
  await sql`CREATE INDEX idx_user_key_all_daily ON game (user_id, identity_provider, is_daily)`.execute(
    db,
  );
  await sql`CREATE INDEX idx_user_key_is_daily ON game (is_daily)`.execute(db);
  await sql`CREATE INDEX idx_game_status ON game (status)`.execute(db);
  await sql`CREATE INDEX idx_game_arena_id ON game USING hash (arena_id)`.execute(
    db,
  );
  await sql`CREATE UNIQUE INDEX idx_reminder_user_key ON reminder (user_id, identity_provider)`.execute(
    db,
  );
  await sql`CREATE INDEX idx_reminder_enabled_at ON reminder (enabled_at)`.execute(
    db,
  );
  await sql`CREATE INDEX idx_reminder_last_sent_at ON reminder (last_sent_at)`.execute(
    db,
  );
}

export async function down(db: Kysely<any>): Promise<void> {
  // Drop views first (depend on tables)
  await sql`DROP VIEW IF EXISTS v_game`.execute(db);
  await sql`DROP VIEW IF EXISTS v_custom_game`.execute(db);

  // Drop tables
  await sql`DROP TABLE IF EXISTS championship_signup`.execute(db);
  await sql`DROP TABLE IF EXISTS user_settings`.execute(db);
  await sql`DROP TABLE IF EXISTS reminder`.execute(db);
  await sql`DROP TABLE IF EXISTS arena`.execute(db);
  await sql`DROP TABLE IF EXISTS custom_game`.execute(db);
  await sql`DROP TABLE IF EXISTS game`.execute(db);

  // Drop enums
  await sql`DROP TYPE IF EXISTS game_status_type`.execute(db);
  await sql`DROP TYPE IF EXISTS identity_provider_type`.execute(db);
}
