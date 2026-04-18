import type { ConversationSummary } from "@/types";

export const DEFAULT_CONVERSATION_LABEL = "新对话";
const MAX_CONVERSATION_LABEL_LENGTH = 11;

function normalizeConversationLabelContent(content: string | null | undefined) {
  return String(content ?? "")
    .replace(/\s+/g, " ")
    .replace(/[#>*`_-]/g, " ")
    .trim();
}

function truncateConversationLabel(content: string) {
  if (content.length <= MAX_CONVERSATION_LABEL_LENGTH) {
    return content;
  }

  return `${content.slice(0, MAX_CONVERSATION_LABEL_LENGTH)}...`;
}

export function formatConversationTabLabel(
  title?: string | null,
  starterPrompt?: string | null
) {
  const normalizedTitle = normalizeConversationLabelContent(title);
  if (normalizedTitle) {
    return truncateConversationLabel(normalizedTitle);
  }

  const normalizedPrompt = normalizeConversationLabelContent(starterPrompt);
  if (normalizedPrompt) {
    return truncateConversationLabel(normalizedPrompt);
  }

  return DEFAULT_CONVERSATION_LABEL;
}

export function applyConversationPromptTracking(
  conversations: ConversationSummary[],
  targetConversationId: string,
  prompt: string,
  title?: string | null
) {
  const trimmedPrompt = prompt.trim();
  if (!trimmedPrompt) {
    return conversations;
  }

  const normalizedTitle = normalizeConversationLabelContent(title) || null;

  return conversations.map((conversation) => {
    if (conversation.id !== targetConversationId) {
      return conversation;
    }

    const alreadyCounted = Boolean(conversation.starterPrompt?.trim());
    const nextTitle = normalizedTitle ?? conversation.title ?? null;

    return {
      ...conversation,
      title: nextTitle,
      label: formatConversationTabLabel(nextTitle, trimmedPrompt),
      starterPrompt: alreadyCounted
        ? conversation.starterPrompt ?? trimmedPrompt
        : trimmedPrompt,
      isEmpty: false,
      messageCount: alreadyCounted
        ? conversation.messageCount
        : Math.max(1, conversation.messageCount),
      lastMessageAt: new Date().toISOString(),
    };
  });
}
