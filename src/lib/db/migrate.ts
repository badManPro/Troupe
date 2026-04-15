import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { db } from "./index";
import { resolveMigrationsFolder } from "./paths";

export function runMigrations() {
  const migrationsFolder = resolveMigrationsFolder();
  migrate(db, { migrationsFolder });
}
