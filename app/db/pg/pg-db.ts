import { Pool } from "pg";
import { CamelCasePlugin, Kysely, PostgresDialect } from "kysely";
import { Database } from "./types"; // this is the Database interface we defined earlier

const dialect = new PostgresDialect({
  pool: new Pool({
    connectionString: process.env.PG_CONNECTION_STRING,
    max: 20,
  }),
});

// Database interface is passed to Kysely's constructor, and from now on, Kysely
// knows your database structure.
// Dialect is passed to Kysely's constructor, and from now on, Kysely knows how
// to communicate with your database.
export const pgDb = new Kysely<Database>({
  dialect,
  plugins: [new CamelCasePlugin()],
  log: ["query"],
});
