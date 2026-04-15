import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import type { AgentConfig } from "@/types";
import { PHASE_ORDER, getPhaseIndex } from "@/types";

export async function buildContext(
  projectId: string,
  agent: AgentConfig
): Promise<string> {
  const docs = db
    .select()
    .from(schema.documents)
    .where(eq(schema.documents.projectId, projectId))
    .all();

  if (docs.length === 0) return "";

  const earliestAgentPhaseIndex = Math.min(
    ...agent.phases.map((p) => getPhaseIndex(p))
  );

  const upstreamDocs = docs.filter((doc) => {
    const docPhaseIndex = getPhaseIndex(doc.phase as any);
    return docPhaseIndex < earliestAgentPhaseIndex;
  });

  if (upstreamDocs.length === 0) return "";

  return upstreamDocs
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
