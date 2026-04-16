"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Send, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { ChatMarkdown } from "@/components/chat/chat-markdown";
import { QuestionnaireCard } from "@/components/chat/questionnaire-card";
import { BrainstormProgressCard } from "@/components/chat/brainstorm-progress-card";
import { RequirementsGuideCard } from "@/components/chat/requirements-guide-card";
import {
  analyzeBrainstormProgress,
  shouldShowBrainstormProgress,
} from "@/lib/chat/brainstorm-progress";
import { extractQuestionnaireFromMessage } from "@/lib/chat/questionnaire";
import type { AgentRole, Phase } from "@/types";
import type { ChatStatusData, ChatUIMessage } from "@/types/chat";
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
  initialMessages?: { role: "user" | "assistant"; content: string }[];
  onDocumentGenerated?: () => void;
}

export function ChatPanel({
  projectId,
  conversationId,
  role,
  phase,
  hasExistingPrd = false,
  initialMessages = [],
  onDocumentGenerated,
}: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const agent = getAgentById(role);

  const seedMessages = useMemo(
    () =>
      initialMessages.map((m, i) => ({
        id: String(i),
        role: m.role as "user" | "assistant",
        parts: [{ type: "text" as const, text: m.content }],
      })) as ChatUIMessage[],
    [initialMessages]
  );

  const {
    messages,
    sendMessage,
    regenerate,
    status,
    error,
    clearError,
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
  const brainstormProgress = useMemo(() => {
    if (!shouldShowBrainstormProgress(phase, role)) {
      return null;
    }

    return analyzeBrainstormProgress(messages);
  }, [messages, phase, role]);
  const composerPlaceholder = useMemo(
    () => getComposerPlaceholder(phase, role),
    [phase, role]
  );

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

  return (
    <div className="flex flex-col h-full">
      {brainstormProgress && <BrainstormProgressCard analysis={brainstormProgress} />}

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
          onRetry={() => {
            clearError();
            regenerate();
          }}
        />
      </ScrollArea>

      <ChatComposer
        disabled={isGenerating}
        placeholder={composerPlaceholder}
        onSend={handleSend}
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
  onRetry,
}: ChatTranscriptProps) {
  const lastMessage = messages[messages.length - 1];
  const showFallbackLoader =
    isGenerating &&
    !!lastMessage &&
    !getMessageText(lastMessage) &&
    !getMessageStatus(lastMessage);

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

          {phase === "requirements" && (
            <RequirementsGuideCard
              hasExistingPrd={hasExistingPrd}
              role={agentId ?? "pm"}
              onPromptSelect={onQuestionnaireSubmit}
            />
          )}
        </div>
      )}

      {messages.map((message, index) => {
        const text = getMessageText(message);
        const statusPart = getMessageStatus(message);
        const shouldRender = Boolean(text) || Boolean(statusPart);
        const isStreamingAssistantMessage =
          message.role === "assistant" &&
          isGenerating &&
          index === messages.length - 1;
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
                "min-w-0 rounded-2xl px-4 py-3 text-sm leading-relaxed",
                message.role === "user"
                  ? "max-w-[80%] bg-primary text-primary-foreground rounded-tr-sm shadow-sm"
                  : "max-w-[85%] rounded-tl-sm border border-border/70 bg-card/90 shadow-sm backdrop-blur-sm lg:max-w-[48rem]"
              )}
            >
              {message.role === "assistant" &&
                statusPart &&
                statusPart.phase !== "complete" && (
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

              {text ? (
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
                statusPart && (
                  <div className="flex items-center gap-1.5 py-1 text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                    <span className="h-1.5 w-1.5 rounded-full bg-current/70 animate-pulse" />
                    <span className="h-1.5 w-1.5 rounded-full bg-current/50 animate-pulse" />
                  </div>
                )
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
  disabled: boolean;
  placeholder: string;
  onSend: (message: string) => void;
}

const ChatComposer = memo(function ChatComposer({
  disabled,
  placeholder,
  onSend,
}: ChatComposerProps) {
  const [inputValue, setInputValue] = useState("");

  const handleSend = useCallback(() => {
    const nextMessage = inputValue.trim();
    if (!nextMessage || disabled) return;

    onSend(nextMessage);
    setInputValue("");
  }, [disabled, inputValue, onSend]);

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
    <div className="border-t p-4 bg-card/50">
      <div className="flex gap-2">
        <Textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="min-h-[44px] max-h-32 resize-none"
          rows={1}
          disabled={disabled}
        />
        <Button
          type="button"
          size="icon"
          disabled={!inputValue.trim() || disabled}
          className="shrink-0 self-end"
          onClick={handleSend}
        >
          {disabled ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  );
});
