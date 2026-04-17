import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { ensureDb } from "@/lib/db/init";
import { syncDerivedDocuments } from "@/lib/documents/sync";
import { getPhaseArtifactSnapshot } from "@/lib/workspace/phase-artifacts";
import {
  buildRequirementsPhaseWorkflow,
  serializeRequirementsPmCompleted,
} from "@/lib/workspace/requirements-phase";
import { DOCUMENT_TYPE_LABELS } from "@/lib/documents/catalog";
import { v4 as uuid } from "uuid";
import { eq, and, inArray } from "drizzle-orm";
import type { DocumentType, Phase, ProjectDocument } from "@/types";
import type { PersistedChatMessage } from "@/types/chat";

function getProjectDocuments(projectId: string) {
  return db
    .select()
    .from(schema.documents)
    .where(eq(schema.documents.projectId, projectId))
    .all()
    .map((document) => ({
      ...document,
      type: document.type as DocumentType,
      phase: document.phase as Phase,
      createdAt: document.createdAt.toISOString(),
      updatedAt: document.updatedAt.toISOString(),
    })) as ProjectDocument[];
}

function getRequirementsWorkflow(projectId: string, checklist: string | null | undefined) {
  const requirementConversations = db
    .select()
    .from(schema.conversations)
    .where(eq(schema.conversations.projectId, projectId))
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

  return buildRequirementsPhaseWorkflow({
    checklist,
    documents: getProjectDocuments(projectId),
    pmMessages: getRoleMessages("pm"),
    qaMessages: getRoleMessages("qa"),
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  ensureDb();
  const { id } = await params;
  const body = await req.json();
  const { phase, action } = body;

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

  if (action === "complete_requirements_pm") {
    if (phase !== "requirements") {
      return NextResponse.json(
        { error: "当前动作仅适用于需求定义阶段" },
        { status: 400 }
      );
    }

    syncDerivedDocuments(id);
    const workflow = getRequirementsWorkflow(id, gate?.checklist);

    if (!workflow.canStartQa) {
      return NextResponse.json(
        {
          error:
            "产品经理这一步还没收口。先把当前阶段 PRD、目标用户/主流程和 MVP 优先级补齐，再进入 QA 评审。",
        },
        { status: 400 }
      );
    }

    const checklist = serializeRequirementsPmCompleted(gate?.checklist);

    if (gate) {
      db.update(schema.phaseGates)
        .set({ checklist })
        .where(eq(schema.phaseGates.id, gate.id))
        .run();
    } else {
      db.insert(schema.phaseGates)
        .values({
          id: uuid(),
          projectId: id,
          phase,
          status: "in_progress",
          checklist,
        })
        .run();
    }

    return NextResponse.json({ success: true });
  }

  if (action === "approve") {
    syncDerivedDocuments(id);

    const documents = getProjectDocuments(id);

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

    if (phase === "requirements") {
      const workflow = getRequirementsWorkflow(id, gate?.checklist);

      if (!workflow.pmStepCompleted) {
        return NextResponse.json(
          {
            error:
              "需求定义阶段必须先完成产品经理收口，再进入 QA 评审。",
          },
          { status: 400 }
        );
      }

      if (!workflow.canApprove) {
        return NextResponse.json(
          {
            error:
              "QA 评审还没完成。请先补齐边界场景、验收标准和风险/开放问题，再确认完成。",
          },
          { status: 400 }
        );
      }
    }

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
