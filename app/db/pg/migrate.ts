import "dotenv/config";
import * as path from "path";
import { promises as fs } from "fs";
import {
  Migrator,
  FileMigrationProvider,
  type MigrationResultSet,
} from "kysely";
import { pgDb } from "./pg-db";

async function migrate() {
  const migrator = new Migrator({
    db: pgDb,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.resolve(__dirname, "../../../migrations"),
    }),
  });

  const direction = process.argv.includes("--down") ? "down" : "up";

  let results: MigrationResultSet;
  if (direction === "down") {
    results = await migrator.migrateDown();
  } else {
    results = await migrator.migrateToLatest();
  }

  const { results: migrations, error } = results;

  migrations?.forEach((it) => {
    if (it.status === "Success") {
      console.log(
        `migration "${it.migrationName}" was ${direction === "down" ? "reverted" : "executed"} successfully`
      );
    } else if (it.status === "Error") {
      console.error(`failed to execute migration "${it.migrationName}"`);
    }
  });

  if (error) {
    console.error("failed to migrate");
    console.error(error);
    process.exit(1);
  }

  await pgDb.destroy();
}

migrate();
