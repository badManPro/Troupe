import { v4 as uuid } from "uuid";
import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { DOCUMENT_TYPE_LABELS } from "@/lib/documents/catalog";
import {
  buildSharedDesignSpec,
  extractMarkdownSection,
  inferDesignConversationTrack,
  isPlaceholderDesignSection,
  isRelevantDesignTrackResponse,
  normalizeDesignContribution,
  type DesignConversationTrack,
} from "@/lib/documents/design-spec";
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

interface DesignTrackContribution {
  track: DesignConversationTrack;
  content: string;
  updatedAt: Date;
}

const REQUIREMENTS_REVIEW_HEADING_PATTERN =
  /(^|\n)#\s*(?:qa\s*(?:需求)?(?:审查|评审)(?:结论)?|需求\s*qa\s*评审|需求评审)/i;

const REQUIREMENTS_REVIEW_CORE_SECTION_PATTERN =
  /##\s*(?:最优先补齐的缺口|最需要优先补齐的缺口|关键缺口|重点缺口|关键待补齐项|(?:关键|重点|主要)?边界场景(?:与异常流程)?|(?:关键|重点|主要)?异常流程|验收标准(?:草案|建议)?)/i;

const REQUIREMENTS_REVIEW_RISK_OR_OPEN_QUESTION_SECTION_PATTERN =
  /##\s*(?:当前(?:最高)?风险|核心风险|主要风险|风险(?:与开放问题)?|(?:最需要(?:现在)?确认|还需要(?:PM|产品)?确认|仍需确认|待确认|待定|决策|需(?:PM|产品)?确认|需要(?:PM|产品)?确认)(?:的)?(?:开放)?问题|开放问题|待确认问题|待定问题|决策问题)/i;

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
    matches.push({
      type: "design_spec",
      title: DOCUMENT_TYPE_LABELS.design_spec,
      content: designContent,
      phase: conversationPhase,
    });

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

  if (
    conversationRole === "designer" &&
    conversationPhase === "design" &&
    /##\s*设计产出总览/i.test(content) &&
    /(四个核心页面|核心页面|Screen\s*\d+)/i.test(content)
  ) {
    matches.push({
      type: "design_mockup",
      title: DOCUMENT_TYPE_LABELS.design_mockup,
      content: `# ${DOCUMENT_TYPE_LABELS.design_mockup}\n\n${content}`.trim(),
      phase: conversationPhase,
    });
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

  const requirementsReviewContent = extractDocumentFromHeading(
    content,
    REQUIREMENTS_REVIEW_HEADING_PATTERN
  );
  if (
    conversationRole === "qa" &&
    conversationPhase === "requirements" &&
    requirementsReviewContent &&
    REQUIREMENTS_REVIEW_CORE_SECTION_PATTERN.test(requirementsReviewContent) &&
    REQUIREMENTS_REVIEW_RISK_OR_OPEN_QUESTION_SECTION_PATTERN.test(
      requirementsReviewContent
    )
  ) {
    matches.push({
      type: "requirements_review",
      title: DOCUMENT_TYPE_LABELS.requirements_review,
      content: requirementsReviewContent,
      phase: conversationPhase,
    });
  }

  const testPlanContent = extractDocumentFromHeading(content, /(^|\n)#\s*测试方案/);
  if (
    conversationRole === "qa" &&
    conversationPhase === "delivery" &&
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

function buildDesignAggregationDocuments(
  projectId: string,
  contributions: Partial<Record<DesignConversationTrack, DesignTrackContribution>>
) {
  const activeContributions = Object.values(contributions).filter(
    (contribution): contribution is DesignTrackContribution => Boolean(contribution)
  );

  if (activeContributions.length === 0) {
    return [];
  }

  const existingDesignSpec = db
    .select()
    .from(schema.documents)
    .where(
      and(
        eq(schema.documents.projectId, projectId),
        eq(schema.documents.type, "design_spec")
      )
    )
    .get();

  const designSpecContent = buildSharedDesignSpec({
    existingContent: existingDesignSpec?.content ?? "",
    userFlowContent: contributions.user_flow?.content,
    informationArchitectureContent:
      contributions.information_architecture?.content,
    visualStyleContent: contributions.visual_style?.content,
  });
  const designSpecUpdatedAt = activeContributions.reduce((latest, contribution) =>
    contribution.updatedAt > latest ? contribution.updatedAt : latest
  , activeContributions[0].updatedAt);
  const designSpecDocuments: Array<{
    document: DerivedDocumentMatch;
    updatedAt: Date;
  }> = [
    {
      document: {
        type: "design_spec",
        title: DOCUMENT_TYPE_LABELS.design_spec,
        content: designSpecContent,
        phase: "design",
      },
      updatedAt: designSpecUpdatedAt,
    },
  ];

  const userFlowSection = extractMarkdownSection(designSpecContent, "用户流程图");
  if (!isPlaceholderDesignSection(userFlowSection)) {
    designSpecDocuments.push({
      document: {
        type: "user_flow",
        title: DOCUMENT_TYPE_LABELS.user_flow,
        content: `# ${DOCUMENT_TYPE_LABELS.user_flow}\n\n${userFlowSection}`.trim(),
        phase: "design",
      },
      updatedAt:
        contributions.user_flow?.updatedAt ?? designSpecUpdatedAt,
    });
  }

  const wireframeSection = extractMarkdownSection(designSpecContent, "页面清单");
  if (!isPlaceholderDesignSection(wireframeSection)) {
    designSpecDocuments.push({
      document: {
        type: "wireframe",
        title: DOCUMENT_TYPE_LABELS.wireframe,
        content: `# ${DOCUMENT_TYPE_LABELS.wireframe}\n\n${wireframeSection}`.trim(),
        phase: "design",
      },
      updatedAt:
        contributions.information_architecture?.updatedAt ?? designSpecUpdatedAt,
    });
  }

  return designSpecDocuments;
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
  const designTrackContributions: Partial<
    Record<DesignConversationTrack, DesignTrackContribution>
  > = {};

  for (const conversation of conversations) {
    const conversationMessages = db
      .select()
      .from(schema.messages)
      .where(eq(schema.messages.conversationId, conversation.id))
      .orderBy(desc(schema.messages.createdAt))
      .all();
    const assistantMessages = conversationMessages.filter(
      (message) => message.role === "assistant"
    );

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

    if (
      conversation.role === "designer" &&
      conversation.phase === "design"
    ) {
      const firstUserPrompt =
        conversationMessages
          .filter((message) => message.role === "user")
          .reverse()
          .find((message) => message.content.trim())?.content ?? "";
      const track = inferDesignConversationTrack(firstUserPrompt);

      if (!track) {
        continue;
      }

      const latestRelevantAssistant = assistantMessages.find((message) =>
        isRelevantDesignTrackResponse(track, message.content)
      );

      if (!latestRelevantAssistant) {
        continue;
      }

      const nextContribution = {
        track,
        content: normalizeDesignContribution(latestRelevantAssistant.content),
        updatedAt: latestRelevantAssistant.createdAt,
      };
      const currentContribution = designTrackContributions[track];

      if (
        !currentContribution ||
        currentContribution.updatedAt < nextContribution.updatedAt
      ) {
        designTrackContributions[track] = nextContribution;
      }
    }
  }

  const aggregatedDesignDocuments = buildDesignAggregationDocuments(
    projectId,
    designTrackContributions
  );

  for (const { document, updatedAt } of aggregatedDesignDocuments) {
    upsertDerivedDocument(projectId, document, updatedAt);
  }
}
