import { v4 as uuid } from "uuid";
import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { DOCUMENT_TYPE_LABELS } from "@/lib/documents/catalog";
import type { AgentRole, DocumentType, Phase } from "@/types";

interface DerivedDocumentMatch {
  type: DocumentType;
  title: string;
  content: string;
  phase: Phase;
}

interface MessageCandidateInput {
  conversationRole: AgentRole;
  conversationPhase: Phase;
  content: string;
}

function extractDocumentFromHeading(content: string, headingPattern: RegExp) {
  const match = headingPattern.exec(content);
  if (!match || typeof match.index !== "number") {
    return null;
  }

  return content.slice(match.index).trim();
}

function extractSection(
  content: string,
  startPattern: RegExp,
  endPattern?: RegExp
) {
  const startMatch = startPattern.exec(content);
  if (!startMatch || typeof startMatch.index !== "number") {
    return null;
  }

  const startIndex = startMatch.index;
  const rest = content.slice(startIndex);

  if (!endPattern) {
    return rest.trim();
  }

  const endMatch = endPattern.exec(rest.slice(startMatch[0].length));
  if (!endMatch || typeof endMatch.index !== "number") {
    return rest.trim();
  }

  return rest.slice(0, startMatch[0].length + endMatch.index).trim();
}

function detectDerivedDocuments({
  conversationRole,
  conversationPhase,
  content,
}: MessageCandidateInput): DerivedDocumentMatch[] {
  const matches: DerivedDocumentMatch[] = [];

  const prdContent = extractDocumentFromHeading(
    content,
    /(^|\n)#\s*产品需求文档(?:\s*\(PRD\))?/i
  );
  if (
    conversationRole === "pm" &&
    prdContent &&
    /##\s*产品概述/.test(prdContent) &&
    /##\s*功能清单/.test(prdContent)
  ) {
    matches.push({
      type: "prd",
      title: DOCUMENT_TYPE_LABELS.prd,
      content: prdContent,
      phase: conversationPhase,
    });
  }

  const designContent = extractDocumentFromHeading(content, /(^|\n)#\s*ui\/ux\s*设计方案/i);
  if (
    conversationRole === "designer" &&
    designContent &&
    /##\s*用户流程图/.test(designContent) &&
    /##\s*页面清单/.test(designContent)
  ) {
    const userFlowSection = extractSection(
      designContent,
      /##\s*用户流程图/i,
      /##\s*页面清单/i
    );
    const wireframeSection = extractSection(
      designContent,
      /##\s*页面清单/i,
      /##\s*设计规范/i
    );

    if (userFlowSection) {
      matches.push({
        type: "user_flow",
        title: DOCUMENT_TYPE_LABELS.user_flow,
        content: `# ${DOCUMENT_TYPE_LABELS.user_flow}\n\n${userFlowSection}`.trim(),
        phase: conversationPhase,
      });
    }

    if (wireframeSection) {
      matches.push({
        type: "wireframe",
        title: DOCUMENT_TYPE_LABELS.wireframe,
        content: `# ${DOCUMENT_TYPE_LABELS.wireframe}\n\n${wireframeSection}`.trim(),
        phase: conversationPhase,
      });
    }
  }

  const architectureContent = extractDocumentFromHeading(
    content,
    /(^|\n)#\s*系统架构设计文档/
  );
  if (
    conversationRole === "architect" &&
    architectureContent &&
    /##\s*技术选型/.test(architectureContent) &&
    /##\s*系统架构/.test(architectureContent)
  ) {
    matches.push({
      type: "architecture",
      title: DOCUMENT_TYPE_LABELS.architecture,
      content: architectureContent,
      phase: conversationPhase,
    });

    const dbSection = extractSection(
      architectureContent,
      /##\s*数据模型/i,
      /##\s*api\s*设计/i
    );
    if (dbSection) {
      matches.push({
        type: "db_schema",
        title: DOCUMENT_TYPE_LABELS.db_schema,
        content: `# ${DOCUMENT_TYPE_LABELS.db_schema}\n\n${dbSection}`.trim(),
        phase: conversationPhase,
      });
    }
  }

  const apiSpecContent = extractDocumentFromHeading(content, /(^|\n)#\s*后端实现方案/);
  if (
    conversationRole === "backend" &&
    apiSpecContent &&
    /##\s*API 设计/.test(apiSpecContent)
  ) {
    matches.push({
      type: "api_spec",
      title: DOCUMENT_TYPE_LABELS.api_spec,
      content: apiSpecContent,
      phase: conversationPhase,
    });
  }

  const testPlanContent = extractDocumentFromHeading(content, /(^|\n)#\s*测试方案/);
  if (
    conversationRole === "qa" &&
    testPlanContent &&
    /##\s*测试策略/.test(testPlanContent)
  ) {
    matches.push({
      type: "test_plan",
      title: DOCUMENT_TYPE_LABELS.test_plan,
      content: testPlanContent,
      phase: conversationPhase,
    });
  }

  const projectPlanContent = extractDocumentFromHeading(
    content,
    /(^|\n)#\s*项目计划/
  );
  if (
    conversationRole === "coordinator" &&
    projectPlanContent &&
    /##\s*里程碑/.test(projectPlanContent)
  ) {
    matches.push({
      type: "project_plan",
      title: DOCUMENT_TYPE_LABELS.project_plan,
      content: projectPlanContent,
      phase: conversationPhase,
    });
  }

  return matches;
}

function upsertDerivedDocument(
  projectId: string,
  derivedDocument: DerivedDocumentMatch,
  messageCreatedAt: Date
) {
  const existing = db
    .select()
    .from(schema.documents)
    .where(
      and(
        eq(schema.documents.projectId, projectId),
        eq(schema.documents.type, derivedDocument.type)
      )
    )
    .get();

  if (existing) {
    const existingUpdatedAt = existing.updatedAt?.getTime?.() ?? 0;
    if (
      existing.content.trim() === derivedDocument.content.trim() &&
      existing.phase === derivedDocument.phase
    ) {
      return;
    }

    if (existingUpdatedAt > messageCreatedAt.getTime()) {
      return;
    }

    db.update(schema.documents)
      .set({
        title: derivedDocument.title,
        content: derivedDocument.content,
        phase: derivedDocument.phase,
        version: existing.version + 1,
        updatedAt: messageCreatedAt,
      })
      .where(eq(schema.documents.id, existing.id))
      .run();

    return;
  }

  db.insert(schema.documents)
    .values({
      id: uuid(),
      projectId,
      type: derivedDocument.type,
      title: derivedDocument.title,
      content: derivedDocument.content,
      phase: derivedDocument.phase,
      createdAt: messageCreatedAt,
      updatedAt: messageCreatedAt,
    })
    .run();
}

export function syncDerivedDocuments(projectId: string) {
  const conversations = db
    .select()
    .from(schema.conversations)
    .where(eq(schema.conversations.projectId, projectId))
    .orderBy(desc(schema.conversations.createdAt))
    .all();

  for (const conversation of conversations) {
    const assistantMessages = db
      .select()
      .from(schema.messages)
      .where(
        and(
          eq(schema.messages.conversationId, conversation.id),
          eq(schema.messages.role, "assistant")
        )
      )
      .orderBy(desc(schema.messages.createdAt))
      .all();

    for (const message of assistantMessages) {
      const derivedDocuments = detectDerivedDocuments({
        conversationRole: conversation.role as AgentRole,
        conversationPhase: conversation.phase as Phase,
        content: message.content,
      });

      if (derivedDocuments.length === 0) {
        continue;
      }

      for (const derivedDocument of derivedDocuments) {
        upsertDerivedDocument(projectId, derivedDocument, message.createdAt);
      }
    }
  }
}
