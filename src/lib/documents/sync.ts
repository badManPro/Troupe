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

function detectDerivedDocument({
  conversationRole,
  conversationPhase,
  content,
}: MessageCandidateInput): DerivedDocumentMatch | null {
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
    return {
      type: "prd",
      title: DOCUMENT_TYPE_LABELS.prd,
      content: prdContent,
      phase: conversationPhase,
    };
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
    return {
      type: "architecture",
      title: DOCUMENT_TYPE_LABELS.architecture,
      content: architectureContent,
      phase: conversationPhase,
    };
  }

  const apiSpecContent = extractDocumentFromHeading(content, /(^|\n)#\s*后端实现方案/);
  if (
    conversationRole === "backend" &&
    apiSpecContent &&
    /##\s*API 设计/.test(apiSpecContent)
  ) {
    return {
      type: "api_spec",
      title: DOCUMENT_TYPE_LABELS.api_spec,
      content: apiSpecContent,
      phase: conversationPhase,
    };
  }

  const testPlanContent = extractDocumentFromHeading(content, /(^|\n)#\s*测试方案/);
  if (
    conversationRole === "qa" &&
    testPlanContent &&
    /##\s*测试策略/.test(testPlanContent)
  ) {
    return {
      type: "test_plan",
      title: DOCUMENT_TYPE_LABELS.test_plan,
      content: testPlanContent,
      phase: conversationPhase,
    };
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
    return {
      type: "project_plan",
      title: DOCUMENT_TYPE_LABELS.project_plan,
      content: projectPlanContent,
      phase: conversationPhase,
    };
  }

  return null;
}

export function syncDerivedDocuments(projectId: string) {
  const existingDocuments = db
    .select()
    .from(schema.documents)
    .where(eq(schema.documents.projectId, projectId))
    .all();

  const existingTypes = new Set(existingDocuments.map((doc) => doc.type));

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
      const derivedDocument = detectDerivedDocument({
        conversationRole: conversation.role as AgentRole,
        conversationPhase: conversation.phase as Phase,
        content: message.content,
      });

      if (!derivedDocument || existingTypes.has(derivedDocument.type)) {
        continue;
      }

      db.insert(schema.documents)
        .values({
          id: uuid(),
          projectId,
          type: derivedDocument.type,
          title: derivedDocument.title,
          content: derivedDocument.content,
          phase: derivedDocument.phase,
        })
        .run();

      existingTypes.add(derivedDocument.type);
    }
  }
}
