"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  Check,
  Loader2,
  PencilLine,
  RotateCcw,
  Send,
  Square,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { ChatMarkdown } from "@/components/chat/chat-markdown";
import { QuestionnaireCard } from "@/components/chat/questionnaire-card";
import { ChatPromptSuggestions } from "@/components/chat/chat-prompt-suggestions";
import { PhaseContextCard } from "@/components/chat/phase-context-card";
import { extractQuestionnaireFromMessage } from "@/lib/chat/questionnaire";
import {
  analyzePhaseProgress,
  getPhaseChatGuide,
  getRemainingQuickStartActions,
  type QuickStartAction,
} from "@/lib/chat/phase-chat-guidance";
import type { AgentRole, DocumentType, Phase } from "@/types";
import type {
  ChatStatusData,
  ChatUIMessage,
  PersistedChatMessage,
} from "@/types/chat";
import { getAgentById } from "@/lib/agents/registry";

type ChatMessagePart = ChatUIMessage["parts"][number];
const STREAM_UPDATE_THROTTLE_MS = 80;

function isChatStatusPart(
  part: ChatMessagePart
): part is Extract<ChatMessagePart, { type: "data-chatStatus" }> {
  return part.type === "data-chatStatus";
}

function getMessageText(message: ChatUIMessage): string {
  return message.parts
    .filter((p) => p.type === "text")
    .map((p) => p.text ?? "")
    .join("");
}

function getMessageStatus(message: ChatUIMessage): ChatStatusData | null {
  const statusParts = message.parts.filter(isChatStatusPart);
  return statusParts.length > 0 ? statusParts[statusParts.length - 1].data : null;
}

function toChatUIMessage(message: PersistedChatMessage): ChatUIMessage {
  return {
    id: message.id,
    role: message.role,
    parts: [{ type: "text", text: message.content }],
  };
}

function getEmptyStateCopy(
  phase: Phase,
  hasExistingPrd: boolean,
  agentId?: AgentRole,
  agentName?: string
) {
  if (phase === "requirements" && agentId === "pm") {
    return hasExistingPrd
      ? "这一阶段要把上一阶段形成的 PRD 初稿收束成可评审版本。重点是补齐缺口、收住 MVP 边界，并把优先级定清楚。"
      : "这一阶段要把头脑风暴里的想法沉淀成可评审 PRD。先收束目标用户、核心场景和 MVP 边界，再形成功能优先级。";
  }

  if (phase === "requirements" && agentId === "qa") {
    return "这一阶段由 QA 帮你补齐需求缺口。重点检查边界场景、异常流程、验收标准和后续实现风险。";
  }

  if (agentId === "pm") {
    return "你好！我是产品经理。告诉我你的想法，不管多模糊都没关系，我来帮你一步步梳理清楚。";
  }

  return `你好！我是${agentName}。让我们一起把方案推进下去。`;
}

function getComposerPlaceholder(phase: Phase, role: AgentRole) {
  if (phase === "requirements" && role === "pm") {
    return "例如：请基于现有 PRD 帮我收敛 MVP，并补齐 P0 / P1 / P2";
  }

  if (phase === "requirements" && role === "qa") {
    return "例如：请从 QA 角度补验收标准、边界场景和风险点";
  }

  if (phase === "brainstorm" && role === "pm") {
    return "输入你的产品想法，我来帮你一起收敛...";
  }

  return "输入你的想法或回复...";
}

interface ChatPanelProps {
  projectId: string;
  conversationId: string | null;
  role: AgentRole;
  phase: Phase;
  hasExistingPrd?: boolean;
  availableDocumentTypes?: DocumentType[];
  initialMessages?: PersistedChatMessage[];
  onDocumentGenerated?: () => void;
}

export function ChatPanel({
  projectId,
  conversationId,
  role,
  phase,
  hasExistingPrd = false,
  availableDocumentTypes = [],
  initialMessages = [],
  onDocumentGenerated,
}: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const agent = getAgentById(role);

  const seedMessages = useMemo(
    () => initialMessages.map(toChatUIMessage),
    [initialMessages]
  );

  const {
    messages,
    sendMessage,
    regenerate,
    status,
    error,
    clearError,
    setMessages,
    stop,
  } = useChat<ChatUIMessage>({
    id: conversationId ?? undefined,
    experimental_throttle: STREAM_UPDATE_THROTTLE_MS,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: { projectId, conversationId, role, phase },
    }),
    messages: seedMessages,
    onFinish: () => {
      onDocumentGenerated?.();
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const isGenerating = status === "streaming" || status === "submitted";
  const phaseGuide = useMemo(
    () => getPhaseChatGuide(phase, role, { hasExistingPrd }),
    [hasExistingPrd, phase, role]
  );
  const phaseProgress = useMemo(
    () =>
      analyzePhaseProgress(
        phase,
        role,
        phaseGuide,
        messages,
        availableDocumentTypes
      ),
    [availableDocumentTypes, messages, phase, phaseGuide, role]
  );
  const remainingQuickStartActions = useMemo(() => {
    return getRemainingQuickStartActions(messages, phaseGuide.actions);
  }, [messages, phaseGuide]);
  const composerPlaceholder = useMemo(
    () => getComposerPlaceholder(phase, role),
    [phase, role]
  );
  const composerSuggestionTitle = useMemo(() => {
    if (remainingQuickStartActions.length === 0) {
      return "";
    }

    return messages.length === 0 ? "你可以这样开始" : "你还可以这样继续";
  }, [messages.length, remainingQuickStartActions.length]);

  const handleSend = useCallback(
    (message: string) => {
      if (!message.trim() || isGenerating) return;
      sendMessage({ text: message.trim() });
    },
    [isGenerating, sendMessage]
  );

  const handleQuestionnaireSubmit = useCallback(
    (message: string) => {
      if (isGenerating) return;
      sendMessage({ text: message });
    },
    [isGenerating, sendMessage]
  );

  const handleStop = useCallback(() => {
    if (!isGenerating) return;
    stop();
  }, [isGenerating, stop]);

  const handleEditResend = useCallback(
    async (messageId: string, content: string) => {
      if (isGenerating || !conversationId) return;

      const response = await fetch(`/api/projects/${projectId}/messages`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          messageId,
          content,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error ?? "更新消息失败");
      }

      const nextMessages = (payload.messages as PersistedChatMessage[]).map(
        toChatUIMessage
      );

      clearError();
      flushSync(() => {
        setMessages(nextMessages);
      });
      regenerate();
    },
    [
      clearError,
      conversationId,
      isGenerating,
      projectId,
      regenerate,
      setMessages,
    ]
  );

  return (
    <div className="flex flex-col h-full">
      <PhaseContextCard
        phase={phase}
        guide={phaseGuide}
        progress={phaseProgress}
        hasMessages={messages.length > 0}
        storageKey={`${phase}-${role}`}
      />

      <ScrollArea className="flex-1 min-h-0" ref={scrollRef}>
        <ChatTranscript
          phase={phase}
          hasExistingPrd={hasExistingPrd}
          agentName={agent?.name}
          agentId={agent?.id}
          messages={messages}
          isGenerating={isGenerating}
          errorMessage={error?.message}
          onQuestionnaireSubmit={handleQuestionnaireSubmit}
          onEditResend={handleEditResend}
          onRetry={() => {
            clearError();
            regenerate();
          }}
        />
      </ScrollArea>

      <ChatComposer
        isGenerating={isGenerating}
        placeholder={composerPlaceholder}
        suggestionTitle={composerSuggestionTitle}
        suggestions={remainingQuickStartActions}
        onSend={handleSend}
        onSuggestionSelect={handleSend}
        onStop={handleStop}
      />
    </div>
  );
}

interface ChatTranscriptProps {
  phase: Phase;
  hasExistingPrd: boolean;
  agentId?: AgentRole;
  agentName?: string;
  messages: ChatUIMessage[];
  isGenerating: boolean;
  errorMessage?: string;
  onQuestionnaireSubmit: (message: string) => void;
  onEditResend: (messageId: string, content: string) => Promise<void>;
  onRetry: () => void;
}

const ChatTranscript = memo(function ChatTranscript({
  phase,
  hasExistingPrd,
  agentId,
  agentName,
  messages,
  isGenerating,
  errorMessage,
  onQuestionnaireSubmit,
  onEditResend,
  onRetry,
}: ChatTranscriptProps) {
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const lastMessage = messages[messages.length - 1];
  const showFallbackLoader =
    isGenerating &&
    !!lastMessage &&
    !getMessageText(lastMessage) &&
    !getMessageStatus(lastMessage);

  useEffect(() => {
    if (editingMessageId && !messages.some((message) => message.id === editingMessageId)) {
      setEditingMessageId(null);
      setEditingValue("");
      setEditError(null);
      setIsSubmittingEdit(false);
    }
  }, [editingMessageId, messages]);

  const startEdit = useCallback((messageId: string, text: string) => {
    setEditingMessageId(messageId);
    setEditingValue(text);
    setEditError(null);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingMessageId(null);
    setEditingValue("");
    setEditError(null);
    setIsSubmittingEdit(false);
  }, []);

  const handleEditSubmit = useCallback(async () => {
    const nextValue = editingValue.trim();
    if (!editingMessageId || !nextValue || isGenerating || isSubmittingEdit) {
      return;
    }

    try {
      setIsSubmittingEdit(true);
      setEditError(null);
      await onEditResend(editingMessageId, nextValue);
      cancelEdit();
    } catch (error) {
      setEditError(error instanceof Error ? error.message : "重新发送失败");
    } finally {
      setIsSubmittingEdit(false);
    }
  }, [
    cancelEdit,
    editingMessageId,
    editingValue,
    isGenerating,
    isSubmittingEdit,
    onEditResend,
  ]);

  return (
    <div className="p-4 space-y-4">
      {messages.length === 0 && (
        <div className="text-center py-12">
          <Avatar className="w-12 h-12 mx-auto mb-3 bg-primary/10">
            <AvatarFallback className="text-primary text-lg">
              {agentName?.[0] ?? "?"}
            </AvatarFallback>
          </Avatar>
          <h3 className="font-medium mb-1">{agentName}</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {getEmptyStateCopy(phase, hasExistingPrd, agentId, agentName)}
          </p>
        </div>
      )}

      {messages.map((message, index) => {
        const text = getMessageText(message);
        const statusPart = getMessageStatus(message);
        const isEditingThisMessage =
          message.role === "user" && editingMessageId === message.id;
        const isStreamingAssistantMessage =
          message.role === "assistant" &&
          isGenerating &&
          index === messages.length - 1;
        const shouldShowStatus =
          Boolean(statusPart) &&
          (statusPart?.phase === "error" ||
            (isStreamingAssistantMessage && statusPart?.phase !== "complete"));
        const shouldRender = Boolean(text) || shouldShowStatus;
        const questionnaire =
          message.role === "assistant" && text && !isStreamingAssistantMessage
            ? extractQuestionnaireFromMessage(text)
            : null;
        const hasLaterUserReply = messages
          .slice(index + 1)
          .some((candidate) => candidate.role === "user");
        const canShowQuestionnaire =
          Boolean(questionnaire) &&
          !hasLaterUserReply &&
          !(isGenerating && index === messages.length - 1);

        if (!shouldRender) return null;

        return (
          <div
            key={message.id}
            className={cn(
              "flex gap-3",
              message.role === "user" ? "flex-row-reverse" : "flex-row"
            )}
          >
            <Avatar
              className={cn(
                "w-8 h-8 shrink-0",
                message.role === "user" ? "bg-primary" : "bg-muted"
              )}
            >
              <AvatarFallback
                className={cn(
                  "text-xs",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {message.role === "user" ? "我" : agentName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div
              className={cn(
                "group min-w-0 rounded-2xl px-4 py-3 text-sm leading-relaxed",
                message.role === "user"
                  ? isEditingThisMessage
                    ? "flex-1 max-w-none bg-primary text-primary-foreground rounded-tr-sm shadow-sm"
                    : "max-w-[80%] bg-primary text-primary-foreground rounded-tr-sm shadow-sm"
                  : "max-w-[85%] rounded-tl-sm border border-border/70 bg-card/90 shadow-sm backdrop-blur-sm lg:max-w-[48rem]"
              )}
            >
              {message.role === "assistant" && statusPart && shouldShowStatus && (
                  <div
                    className={cn(
                      "mb-2 rounded-xl border px-3 py-2 text-[11px] leading-relaxed",
                      statusPart.phase === "error"
                        ? "border-destructive/20 bg-destructive/5 text-destructive"
                        : "border-border/60 bg-background/70 text-muted-foreground"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className={cn(
                          "mt-1 h-2 w-2 shrink-0 rounded-full",
                          statusPart.phase === "error"
                            ? "bg-destructive"
                            : "bg-primary animate-pulse"
                        )}
                      />
                      <div className="space-y-1">
                        <div className="font-medium text-foreground/90">
                          {statusPart.label}
                        </div>
                        {statusPart.detail && <div>{statusPart.detail}</div>}
                      </div>
                    </div>
                  </div>
                )}

              {isEditingThisMessage ? (
                <div className="space-y-3">
                  <Textarea
                    value={editingValue}
                    onChange={(event) => setEditingValue(event.target.value)}
                    disabled={isSubmittingEdit}
                    rows={4}
                    className="min-h-[120px] resize-y border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/60"
                  />

                  {editError && (
                    <p className="text-xs text-primary-foreground/80">{editError}</p>
                  )}

                  <div className="flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                      disabled={isSubmittingEdit}
                      onClick={cancelEdit}
                    >
                      <X className="w-3 h-3" />
                      取消
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-8 px-3"
                      disabled={!editingValue.trim() || isSubmittingEdit || isGenerating}
                      onClick={handleEditSubmit}
                    >
                      {isSubmittingEdit ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Check className="w-3 h-3" />
                      )}
                      重新发送
                    </Button>
                  </div>
                </div>
              ) : text ? (
                message.role === "assistant" ? (
                  isStreamingAssistantMessage ? (
                    <StreamingMessageText content={text} />
                  ) : (
                    <ChatMarkdown content={text} />
                  )
                ) : (
                  <div className="whitespace-pre-wrap break-words">{text}</div>
                )
              ) : (
                message.role === "assistant" &&
                shouldShowStatus && (
                  <div className="flex items-center gap-1.5 py-1 text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                    <span className="h-1.5 w-1.5 rounded-full bg-current/70 animate-pulse" />
                    <span className="h-1.5 w-1.5 rounded-full bg-current/50 animate-pulse" />
                  </div>
                )
              )}

              {message.role === "user" && text && !isEditingThisMessage && !isGenerating && (
                <div className="mt-2 flex justify-end opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-primary-foreground/85 hover:bg-primary-foreground/10 hover:text-primary-foreground"
                    onClick={() => startEdit(message.id, text)}
                  >
                    <PencilLine className="w-3 h-3" />
                    编辑
                  </Button>
                </div>
              )}

              {canShowQuestionnaire && questionnaire && (
                <QuestionnaireCard
                  questionnaire={questionnaire}
                  disabled={isGenerating}
                  onSubmit={onQuestionnaireSubmit}
                />
              )}
            </div>
          </div>
        );
      })}

      {showFallbackLoader && (
        <div className="flex gap-3">
          <Avatar className="w-8 h-8 bg-muted shrink-0">
            <AvatarFallback className="text-xs bg-muted text-muted-foreground">
              {agentName?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="rounded-2xl rounded-tl-sm border border-border/70 bg-card/90 px-4 py-3 shadow-sm">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2 justify-center py-2">
          <p className="text-sm text-destructive">
            {errorMessage || "出错了，请重试"}
          </p>
          <Button variant="ghost" size="sm" onClick={onRetry}>
            <RotateCcw className="w-3 h-3" />
            重试
          </Button>
        </div>
      )}
    </div>
  );
});

const StreamingMessageText = memo(function StreamingMessageText({
  content,
}: {
  content: string;
}) {
  return (
    <div className="whitespace-pre-wrap break-words text-foreground/95">
      {content}
    </div>
  );
});

interface ChatComposerProps {
  isGenerating: boolean;
  placeholder: string;
  suggestionTitle?: string;
  suggestions?: QuickStartAction[];
  onSend: (message: string) => void;
  onSuggestionSelect?: (message: string) => void;
  onStop: () => void;
}

const ChatComposer = memo(function ChatComposer({
  isGenerating,
  placeholder,
  suggestionTitle,
  suggestions = [],
  onSend,
  onSuggestionSelect,
  onStop,
}: ChatComposerProps) {
  const [inputValue, setInputValue] = useState("");

  const handleSend = useCallback(() => {
    const nextMessage = inputValue.trim();
    if (!nextMessage || isGenerating) return;

    onSend(nextMessage);
    setInputValue("");
  }, [inputValue, isGenerating, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  return (
    <div className="border-t bg-card/50 p-4">
      {!isGenerating && suggestionTitle && onSuggestionSelect && suggestions.length > 0 && (
        <ChatPromptSuggestions
          title={suggestionTitle}
          actions={suggestions}
          onSelect={onSuggestionSelect}
          className="mb-3"
        />
      )}

      <div className="flex gap-2">
        <Textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="min-h-[44px] max-h-32 resize-none"
          rows={1}
          disabled={isGenerating}
        />
        <Button
          type="button"
          size="icon"
          variant={isGenerating ? "secondary" : "default"}
          disabled={isGenerating ? false : !inputValue.trim()}
          className="shrink-0 self-end"
          onClick={isGenerating ? onStop : handleSend}
          aria-label={isGenerating ? "停止生成" : "发送消息"}
        >
          {isGenerating ? (
            <Square className="w-3.5 h-3.5 fill-current" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  );
});
