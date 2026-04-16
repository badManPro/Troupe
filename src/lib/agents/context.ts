import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import type { Phase } from "@/types";
import { getPhaseIndex } from "@/types";

export async function buildContext(
  projectId: string,
  currentPhase: Phase
): Promise<string> {
  const docs = db
    .select()
    .from(schema.documents)
    .where(eq(schema.documents.projectId, projectId))
    .all();

  if (docs.length === 0) return "";

  const currentPhaseIndex = getPhaseIndex(currentPhase);

  const relevantDocs = docs
    .filter((doc) => {
      const docPhaseIndex = getPhaseIndex(doc.phase as Phase);
      return docPhaseIndex >= 0 && docPhaseIndex <= currentPhaseIndex;
    })
    .sort((a, b) => {
      const phaseDiff =
        getPhaseIndex(a.phase as Phase) - getPhaseIndex(b.phase as Phase);
      if (phaseDiff !== 0) return phaseDiff;
      return a.updatedAt.getTime() - b.updatedAt.getTime();
    });

  if (relevantDocs.length === 0) return "";

  return relevantDocs
    .map((doc) => `## ${doc.title}\n\n${doc.content}`)
    .join("\n\n---\n\n");
}

export async function getProjectPhaseDocuments(
  projectId: string,
  phase: string
) {
  return db
    .select()
    .from(schema.documents)
    .where(eq(schema.documents.projectId, projectId))
    .all()
    .filter((d) => d.phase === phase);
}
