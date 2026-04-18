export interface MarkdownDiagramSection {
  index: number;
  headingLine: number;
  level: number;
  title: string;
  content: string;
  markdown: string;
  previewEligible: boolean;
}

const EXPLICIT_FLOW_TITLE_PATTERN =
  /(业务流程图?|用户流程图?|核心流程图?|流程图|操作步骤|执行步骤|使用步骤|页面跳转|关键交互|时序图?|数据流|工作流|用户路径|核心路径|用户旅程|旅程|闭环)/i;

const GENERIC_FLOW_TITLE_PATTERN = /流程/i;

const STEP_LINE_PATTERN =
  /^\s*(?:[-*]|\d+\.)\s*(?:(?:用户|系统|AI|应用|页面|桌宠|后台|服务端|客户端)\s*)?(?:进入|打开|点击|创建|选择|输入(?!的)|确认|提交|跳转|展示|生成|返回(?!的|格式)|同步|触发|完成(?!了|后)|关闭|加载|刷新|安装|登录|退出|校验|保存|发送|拉取|推送)/i;

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
  const lines = content.split(/\r?\n/);
  const titleLooksExplicit = EXPLICIT_FLOW_TITLE_PATTERN.test(title);
  const titleLooksGeneric = GENERIC_FLOW_TITLE_PATTERN.test(title);
  const stepLikeLines = lines.filter((line) => STEP_LINE_PATTERN.test(line)).length;
  const orderedStepLines = lines
    .filter((line) => /^\s*\d+\.\s+/.test(line) && STEP_LINE_PATTERN.test(line))
    .length;
  const arrowStepLines = lines
    .filter((line) => /->|=>|→|<-|←/.test(line) && STEP_LINE_PATTERN.test(line))
    .length;
  const strongSequentialSignals =
    orderedStepLines >= 2 || arrowStepLines >= 1;

  if (titleLooksExplicit && (stepLikeLines >= 2 || strongSequentialSignals)) {
    return true;
  }

  if (
    titleLooksGeneric &&
    (orderedStepLines >= 2 || arrowStepLines >= 2 || stepLikeLines >= 3)
  ) {
    return true;
  }

  if (orderedStepLines >= 4) {
    return true;
  }

  if (stepLikeLines >= 3 && arrowStepLines >= 2) {
    return true;
  }

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
