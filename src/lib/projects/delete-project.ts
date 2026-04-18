import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";

export function deleteProjectById(id: string) {
  return db.delete(schema.projects).where(eq(schema.projects.id, id)).run();
}
