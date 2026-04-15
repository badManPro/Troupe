import { db, schema } from "./index";
import { runMigrations } from "./migrate";
import { eq } from "drizzle-orm";

let initialized = false;

export function ensureDb() {
  if (initialized) return;
  runMigrations();
  initialized = true;
}

export async function getSetting(key: string): Promise<string | null> {
  ensureDb();
  const result = db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, key))
    .get();
  return result?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  ensureDb();
  db.insert(schema.settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: schema.settings.key, set: { value } })
    .run();
}
