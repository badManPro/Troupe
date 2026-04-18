import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { ensureDb } from "@/lib/db/init";
import { syncDerivedDocuments } from "@/lib/documents/sync";
import { deleteProjectById } from "@/lib/projects/delete-project";
import { buildRequirementsPhaseWorkflow } from "@/lib/workspace/requirements-phase";
import { eq, inArray } from "drizzle-orm";
import type { DocumentType, Phase, ProjectDocument } from "@/types";
import type { PersistedChatMessage } from "@/types/chat";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  ensureDb();
  const { id } = await params;

  syncDerivedDocuments(id);

  const project = db
    .select()
    .from(schema.projects)
    .where(eq(schema.projects.id, id))
    .get();

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const gates = db
    .select()
    .from(schema.phaseGates)
    .where(eq(schema.phaseGates.projectId, id))
    .all();

  const documents = db
    .select()
    .from(schema.documents)
    .where(eq(schema.documents.projectId, id))
    .all()
    .map((document) => ({
      ...document,
      type: document.type as DocumentType,
      phase: document.phase as Phase,
      createdAt: document.createdAt.toISOString(),
      updatedAt: document.updatedAt.toISOString(),
    })) as ProjectDocument[];

  const requirementsGate =
    gates.find((gate) => gate.phase === "requirements") ?? null;

  let phaseWorkflow: ReturnType<typeof buildRequirementsPhaseWorkflow> | null = null;

  if (project.phase === "requirements" || requirementsGate) {
    const requirementConversations = db
      .select()
      .from(schema.conversations)
      .where(eq(schema.conversations.projectId, id))
      .all()
      .filter((conversation) => conversation.phase === "requirements");

    const requirementConversationIds = requirementConversations.map(
      (conversation) => conversation.id
    );

    const requirementMessages = requirementConversationIds.length
      ? db
          .select()
          .from(schema.messages)
          .where(inArray(schema.messages.conversationId, requirementConversationIds))
          .all()
      : [];

    const messagesByConversation = new Map<string, PersistedChatMessage[]>();
    for (const message of requirementMessages) {
      const bucket = messagesByConversation.get(message.conversationId) ?? [];
      bucket.push({
        id: message.id,
        role: message.role as "user" | "assistant",
        content: message.content,
      });
      messagesByConversation.set(message.conversationId, bucket);
    }

    const getRoleMessages = (role: "pm" | "qa") =>
      requirementConversations
        .filter((conversation) => conversation.role === role)
        .flatMap((conversation) => messagesByConversation.get(conversation.id) ?? []);

    phaseWorkflow = buildRequirementsPhaseWorkflow({
      checklist: requirementsGate?.checklist,
      documents,
      pmMessages: getRoleMessages("pm"),
      qaMessages: getRoleMessages("qa"),
    });
  }

  return NextResponse.json({ ...project, gates, documents, phaseWorkflow });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  ensureDb();
  const { id } = await params;
  const body = await req.json();

  db.update(schema.projects)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(schema.projects.id, id))
    .run();

  const project = db
    .select()
    .from(schema.projects)
    .where(eq(schema.projects.id, id))
    .get();

  return NextResponse.json(project);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  ensureDb();
  const { id } = await params;

  const result = deleteProjectById(id);

  if (result.changes === 0) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
