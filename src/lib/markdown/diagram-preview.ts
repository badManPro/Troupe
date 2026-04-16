export interface MarkdownDiagramSection {
  index: number;
  headingLine: number;
  level: number;
  title: string;
  content: string;
  markdown: string;
  previewEligible: boolean;
}

const FLOW_TITLE_PATTERN =
  /(业务流程|用户流程|核心流程|流程图|流程|操作步骤|执行步骤|使用步骤|页面跳转|关键交互|时序图|时序|数据流|工作流|用户路径|核心路径|用户旅程|旅程|闭环)/i;

const ACTION_PATTERN =
  /(用户|系统|AI|应用|页面|桌宠|进入|打开|点击|创建|选择|生成|展示|提示|提醒|反馈|更新|切换|完成|提交|返回|同步|触发)/i;

const MARKDOWN_HEADING_PATTERN = /^(#{1,6})\s+(.+?)\s*#*\s*$/;
const NESTED_HEADING_PATTERN = /^\s{0,3}#{1,6}\s+/m;

function normalizeHeadingTitle(rawTitle: string) {
  return rawTitle
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`~]/g, "")
    .trim();
}

function isDiagramPreviewCandidate(title: string, content: string) {
  const orderedItems = content.match(/^\s*\d+\.\s+/gm)?.length ?? 0;
  const arrowLinks = content.match(/->|=>|→|<-|←/g)?.length ?? 0;
  const titleLooksSequential = FLOW_TITLE_PATTERN.test(title);
  const orderedStepLines = content
    .split(/\r?\n/)
    .filter((line) => /^\s*\d+\.\s+/.test(line) && ACTION_PATTERN.test(line))
    .length;

  if (titleLooksSequential && (orderedItems >= 2 || orderedStepLines >= 2 || arrowLinks >= 1)) {
    return true;
  }

  if (orderedStepLines >= 4) return true;
  if (arrowLinks >= 2) return true;

  return false;
}

export function extractMarkdownDiagramSections(
  markdown: string
): MarkdownDiagramSection[] {
  const lines = markdown.split(/\r?\n/);
  const headings = lines
    .map((line, index) => {
      const match = line.match(MARKDOWN_HEADING_PATTERN);
      if (!match) return null;

      return {
        headingLine: index + 1,
        level: match[1].length,
        title: normalizeHeadingTitle(match[2]),
      };
    })
    .filter((heading): heading is NonNullable<typeof heading> => Boolean(heading));

  return headings.map((heading, index) => {
    let endLine = lines.length;

    for (let nextIndex = index + 1; nextIndex < headings.length; nextIndex += 1) {
      if (headings[nextIndex].level <= heading.level) {
        endLine = headings[nextIndex].headingLine - 1;
        break;
      }
    }

    const bodyLines = lines.slice(heading.headingLine, endLine);
    const content = bodyLines.join("\n").trim();
    const markdownBlock = lines.slice(heading.headingLine - 1, endLine).join("\n").trim();
    const hasNestedHeadings = NESTED_HEADING_PATTERN.test(content);

    return {
      index,
      headingLine: heading.headingLine,
      level: heading.level,
      title: heading.title,
      content,
      markdown: markdownBlock,
      previewEligible:
        heading.level > 1 &&
        !hasNestedHeadings &&
        content.length >= 24 &&
        isDiagramPreviewCandidate(heading.title, content),
    };
  });
}

export function createMarkdownDiagramSectionMap(markdown: string) {
  return new Map(
    extractMarkdownDiagramSections(markdown).map((section) => [
      section.headingLine,
      section,
    ])
  );
}
