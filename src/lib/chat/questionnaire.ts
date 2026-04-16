import type { ChatQuestion, ChatQuestionnaire } from "@/types/chat";

const GROUP_HINT_RE = /(问题|回答|回复|选择|确认)/;

interface RawListItem {
  number: number;
  start: number;
  block: string;
}

function stripMarkdown(value: string) {
  return value
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .trim();
}

function normalizeInlineOption(value: string) {
  return value.replace(/^(是|还是)/, "").replace(/[？?]\s*$/, "").trim();
}

function parseNumberedItems(text: string) {
  const matches = [...text.matchAll(/^(\d+)\.\s+(.+)$/gm)];

  return matches.map((match, index) => {
    const start = match.index ?? 0;
    const end = matches[index + 1]?.index ?? text.length;

    return {
      number: Number(match[1]),
      start,
      block: text.slice(start, end).trim(),
    } satisfies RawListItem;
  });
}

function groupItems(items: RawListItem[]) {
  const groups: RawListItem[][] = [];
  let current: RawListItem[] = [];

  for (const item of items) {
    const previous = current[current.length - 1];
    const shouldStartNewGroup =
      !previous || item.number !== previous.number + 1 || item.number === 1;

    if (shouldStartNewGroup) {
      if (current.length > 0) groups.push(current);
      current = [item];
      continue;
    }

    current.push(item);
  }

  if (current.length > 0) groups.push(current);
  return groups;
}

function scoreGroup(text: string, group: RawListItem[]) {
  const context = text.slice(Math.max(0, group[0].start - 220), group[0].start);

  const questionLikeCount = group.filter((item) => {
    const firstLine = item.block.split("\n")[0] ?? "";
    return /[？?]\s*$/.test(stripMarkdown(firstLine));
  }).length;

  const optionCount = group.filter((item) =>
    /^\s*-\s+/m.test(item.block)
  ).length;

  return {
    questionLikeCount,
    score:
      questionLikeCount * 2 +
      optionCount +
      (GROUP_HINT_RE.test(context) ? 2 : 0),
  };
}

function buildQuestion(item: RawListItem, index: number): ChatQuestion | null {
  const lines = item.block.split("\n");
  const firstLine = lines[0]?.replace(/^\d+\.\s*/, "").trim();

  if (!firstLine) return null;

  const prompt = stripMarkdown(firstLine);
  const detailLines = lines.slice(1).map((line) => line.trim());
  const descriptionLines: string[] = [];
  const optionLabels: string[] = [];
  let optionMode: "bullet" | "inline" | null = null;
  let postOptionDescriptionCount = 0;

  for (const line of detailLines) {
    const normalizedLine = stripMarkdown(line);

    if (!normalizedLine) {
      if (optionLabels.length >= 2 && postOptionDescriptionCount > 0) {
        break;
      }
      continue;
    }

    if (normalizedLine === "是：" || normalizedLine === "是:") {
      optionMode = "bullet";
      continue;
    }

    if (/^-\s+/.test(line)) {
      if (optionMode === "bullet" || optionLabels.length > 0) {
        optionLabels.push(stripMarkdown(line.replace(/^-\s+/, "")));
        continue;
      }
    }

    if (/^(是|还是)/.test(normalizedLine) && /[？?]\s*$/.test(normalizedLine)) {
      optionMode = "inline";
      optionLabels.push(normalizeInlineOption(normalizedLine));
      continue;
    }

    if (optionLabels.length >= 2) {
      if (
        postOptionDescriptionCount === 0 &&
        !/^(你如果愿意|里面会包含|只要先回答|只要回答|下面|接下来)/.test(
          normalizedLine
        )
      ) {
        descriptionLines.push(normalizedLine);
        postOptionDescriptionCount += 1;
        continue;
      }

      break;
    }

    descriptionLines.push(normalizedLine);
  }

  const options = optionLabels
    .filter((label) => label.length > 0)
    .map((label, optionIndex) => ({
      id: `q${index + 1}-opt${optionIndex + 1}`,
      label,
    }));
  const description =
    options.length >= 2
      ? descriptionLines.join("\n")
      : [...optionLabels.map((label) => `${label}？`), ...descriptionLines].join(
          "\n"
        );

  const fieldType =
    options.length >= 2
      ? "single_choice"
      : description.length > 60 || prompt.length > 22
        ? "long_text"
        : "short_text";

  return {
    id: `q${index + 1}`,
    prompt,
    description: description || undefined,
    fieldType,
    placeholder:
      fieldType === "short_text" || fieldType === "long_text"
        ? `请填写${prompt.replace(/[？?]/g, "")}`
        : undefined,
    options: options.length >= 2 ? options : undefined,
    required: true,
  };
}

export function extractQuestionnaireFromMessage(
  text: string
): ChatQuestionnaire | null {
  const items = parseNumberedItems(text);
  if (items.length < 2) return null;

  const groups = groupItems(items);

  for (let groupIndex = groups.length - 1; groupIndex >= 0; groupIndex -= 1) {
    const group = groups[groupIndex];
    if (group.length < 2 || group.length > 6) continue;

    const { questionLikeCount, score } = scoreGroup(text, group);
    if (questionLikeCount < Math.ceil(group.length / 2) || score < 5) continue;

    const questions = group
      .map((item, index) => buildQuestion(item, index))
      .filter((question): question is ChatQuestion => Boolean(question));

    if (questions.length < 2) continue;

    return {
      title: `回答这 ${questions.length} 个问题`,
      description: "填完后会作为一条普通消息继续发给 AI。",
      questions,
    };
  }

  return null;
}

export function formatQuestionnaireResponse(
  questionnaire: ChatQuestionnaire,
  answers: Record<string, string>
) {
  const lines = questionnaire.questions.map((question, index) => {
    const answer = answers[question.id]?.trim() ?? "";
    const prompt = question.prompt.replace(/[？?]\s*$/, "");
    return `${index + 1}. ${prompt}：${answer}`;
  });

  return ["关于你刚才提出的几个问题，我的回答如下：", "", ...lines].join(
    "\n"
  );
}
