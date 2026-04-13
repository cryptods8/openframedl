import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE badge ADD COLUMN seen boolean NOT NULL DEFAULT false
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE badge DROP COLUMN IF EXISTS seen
  `.execute(db);
}
