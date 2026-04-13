import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'badge_earned'
  `.execute(db);
}

export async function down(_db: Kysely<any>): Promise<void> {
  // PostgreSQL does not support removing values from enums
}
