const DEFAULT_DESIGN_SPEC = `# UI/UX 设计方案

## 设计理念
- 本文档由设计阶段的多个专题对话共同维护。
- 后续设计执行与设计稿生成默认以本稿为准。`;

const DESIGN_SPEC_TITLE_PATTERN = /(^|\n)#\s*UI\/UX\s*设计方案/i;
const PLACEHOLDER_SECTION_CONTENT = "- 待补充";

export type DesignConversationTrack =
  | "user_flow"
  | "information_architecture"
  | "visual_style";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function ensureDesignSpecHeader(content: string) {
  const trimmed = content.trim();
  if (!trimmed) {
    return DEFAULT_DESIGN_SPEC;
  }

  return DESIGN_SPEC_TITLE_PATTERN.test(trimmed)
    ? trimmed
    : `${DEFAULT_DESIGN_SPEC}\n\n${trimmed}`;
}

function demoteHeadings(content: string) {
  return content.replace(/^(#{1,5})(?=\s)/gm, "$1#");
}

function stripLeadingHeading(content: string) {
  return content.replace(/^#{1,6}\s+.+?(?:\n+|$)/, "").trim();
}

export function normalizeDesignContribution(content: string) {
  const stripped = stripLeadingHeading(content.trim());
  if (!stripped) {
    return PLACEHOLDER_SECTION_CONTENT;
  }

  return demoteHeadings(stripped).trim();
}

export function inferDesignConversationTrack(
  prompt: string
): DesignConversationTrack | null {
  const normalized = prompt.trim();
  if (!normalized) {
    return null;
  }

  if (
    /用户流程|关键节点|分支|页面跳转|重点设计的页面/i.test(normalized)
  ) {
    return "user_flow";
  }

  if (
    /页面清单|信息架构|导航层级|页面结构|页面要承载什么内容/i.test(
      normalized
    )
  ) {
    return "information_architecture";
  }

  if (
    /视觉风格|交互方向|配色|字体|组件气质|动效|视觉基调/i.test(normalized)
  ) {
    return "visual_style";
  }

  return null;
}

export function isRelevantDesignTrackResponse(
  track: DesignConversationTrack,
  content: string
) {
  if (!content.trim()) {
    return false;
  }

  if (
    /##\s*设计产出总览/i.test(content) ||
    /看到了.*Allow|权限请求提示|准备好了吗/i.test(content) ||
    /#\s*UI\/UX\s*设计方案/i.test(content)
  ) {
    return false;
  }

  switch (track) {
    case "user_flow":
      return /用户流程|首次启动|每日循环|关键节点|分支|页面跳转/i.test(content);
    case "information_architecture":
      return /页面清单|信息架构|导航层级|页面结构|布局|每日看板|任务详情/i.test(
        content
      );
    case "visual_style":
      return /视觉|配色|字体|组件|动效|交互|设计规范|视觉基调/i.test(content);
    default:
      return false;
  }
}

export function extractMarkdownSection(content: string, title: string) {
  const sectionHeading = new RegExp(
    `(^|\\n)##\\s*${escapeRegExp(title)}\\s*\\n`,
    "i"
  );
  const match = sectionHeading.exec(content);
  if (!match || typeof match.index !== "number") {
    return null;
  }

  const start = match.index + match[0].length;
  const rest = content.slice(start);
  const nextSection = /\n##\s+/i.exec(rest);

  return (nextSection ? rest.slice(0, nextSection.index) : rest).trim();
}

export function upsertMarkdownSection(
  content: string,
  title: string,
  nextSectionContent: string
) {
  const normalizedBase = ensureDesignSpecHeader(content);
  const normalizedSection = nextSectionContent.trim() || PLACEHOLDER_SECTION_CONTENT;
  const sectionHeading = new RegExp(
    `(^|\\n)##\\s*${escapeRegExp(title)}\\s*\\n`,
    "i"
  );
  const match = sectionHeading.exec(normalizedBase);

  if (!match || typeof match.index !== "number") {
    return `${normalizedBase}\n\n## ${title}\n${normalizedSection}`.trim();
  }

  const start = match.index + match[0].length;
  const rest = normalizedBase.slice(start);
  const nextSection = /\n##\s+/i.exec(rest);
  const before = normalizedBase.slice(0, start);
  const after = nextSection ? rest.slice(nextSection.index) : "";

  return `${before}${normalizedSection}${after}`.trim();
}

export function isPlaceholderDesignSection(content: string | null | undefined) {
  return !content || content.trim() === PLACEHOLDER_SECTION_CONTENT;
}

export function buildSharedDesignSpec(params: {
  existingContent?: string | null;
  userFlowContent?: string | null;
  informationArchitectureContent?: string | null;
  visualStyleContent?: string | null;
}) {
  let nextContent = ensureDesignSpecHeader(params.existingContent ?? "");

  const designConceptSection =
    extractMarkdownSection(nextContent, "设计理念") ??
    [
      "- 本文档由设计阶段的多个专题对话共同维护。",
      "- 后续设计执行与设计稿生成默认以本稿为准。",
    ].join("\n");
  nextContent = upsertMarkdownSection(nextContent, "设计理念", designConceptSection);

  const userFlowSection =
    params.userFlowContent?.trim() ??
    extractMarkdownSection(nextContent, "用户流程图") ??
    PLACEHOLDER_SECTION_CONTENT;
  nextContent = upsertMarkdownSection(nextContent, "用户流程图", userFlowSection);

  const iaSection =
    params.informationArchitectureContent?.trim() ??
    extractMarkdownSection(nextContent, "页面清单") ??
    PLACEHOLDER_SECTION_CONTENT;
  nextContent = upsertMarkdownSection(nextContent, "页面清单", iaSection);

  const visualStyleSection =
    params.visualStyleContent?.trim() ??
    extractMarkdownSection(nextContent, "设计规范") ??
    PLACEHOLDER_SECTION_CONTENT;
  nextContent = upsertMarkdownSection(nextContent, "设计规范", visualStyleSection);

  return nextContent.trim();
}

export function isDesignSpecReadyForExecution(content: string) {
  return ["用户流程图", "页面清单", "设计规范"].every((sectionTitle) => {
    const section = extractMarkdownSection(content, sectionTitle);
    return !isPlaceholderDesignSection(section);
  });
}
