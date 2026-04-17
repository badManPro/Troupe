import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { ensureDb } from "@/lib/db/init";
import { syncDerivedDocuments } from "@/lib/documents/sync";
import { getPhaseArtifactSnapshot } from "@/lib/workspace/phase-artifacts";
import { DOCUMENT_TYPE_LABELS } from "@/lib/documents/catalog";
import { v4 as uuid } from "uuid";
import { eq, and } from "drizzle-orm";
import type { DocumentType, Phase } from "@/types";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  ensureDb();
  const { id } = await params;
  const body = await req.json();
  const { phase, action } = body;

  if (action === "approve") {
    syncDerivedDocuments(id);

    const documents = db
      .select()
      .from(schema.documents)
      .where(eq(schema.documents.projectId, id))
      .all()
      .map((document) => ({
        ...document,
        type: document.type as DocumentType,
        phase: document.phase as Phase,
      }));

    const phaseArtifacts = getPhaseArtifactSnapshot(phase, documents);
    if (!phaseArtifacts.hasAllRequiredDocuments) {
      return NextResponse.json(
        {
          error: `当前阶段仍缺少必交付文档：${phaseArtifacts.missingDocumentTypes
            .map((type) => DOCUMENT_TYPE_LABELS[type])
            .join(" / ")}`,
        },
        { status: 400 }
      );
    }

    const gate = db
      .select()
      .from(schema.phaseGates)
      .where(
        and(
          eq(schema.phaseGates.projectId, id),
          eq(schema.phaseGates.phase, phase)
        )
      )
      .get();

    if (gate) {
      db.update(schema.phaseGates)
        .set({ status: "approved", approvedAt: new Date() })
        .where(eq(schema.phaseGates.id, gate.id))
        .run();
    } else {
      db.insert(schema.phaseGates)
        .values({
          id: uuid(),
          projectId: id,
          phase,
          status: "approved",
          checklist: "[]",
          approvedAt: new Date(),
        })
        .run();
    }

    return NextResponse.json({ success: true });
  }

  if (action === "advance") {
    const { nextPhase } = body;
    if (!nextPhase) {
      return NextResponse.json({ error: "Missing nextPhase" }, { status: 400 });
    }

    db.update(schema.projects)
      .set({ phase: nextPhase, updatedAt: new Date() })
      .where(eq(schema.projects.id, id))
      .run();

    const existingGate = db
      .select()
      .from(schema.phaseGates)
      .where(
        and(
          eq(schema.phaseGates.projectId, id),
          eq(schema.phaseGates.phase, nextPhase)
        )
      )
      .get();

    if (!existingGate) {
      db.insert(schema.phaseGates)
        .values({
          id: uuid(),
          projectId: id,
          phase: nextPhase,
          status: "in_progress",
          checklist: "[]",
        })
        .run();
    }

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
