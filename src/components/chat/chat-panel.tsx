"use client";

import { useRef, useEffect, useState } from "react";
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
import { extractQuestionnaireFromMessage } from "@/lib/chat/questionnaire";
import type { AgentRole } from "@/types";
import type { ChatStatusData, ChatUIMessage } from "@/types/chat";
import { getAgentById } from "@/lib/agents/registry";

type ChatMessagePart = ChatUIMessage["parts"][number];

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

interface ChatPanelProps {
  projectId: string;
  conversationId: string | null;
  role: AgentRole;
  initialMessages?: { role: "user" | "assistant"; content: string }[];
  onDocumentGenerated?: () => void;
}

export function ChatPanel({
  projectId,
  conversationId,
  role,
  initialMessages = [],
  onDocumentGenerated,
}: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState("");
  const agent = getAgentById(role);

  const seedMessages = initialMessages.map((m, i) => ({
    id: String(i),
    role: m.role as "user" | "assistant",
    parts: [{ type: "text" as const, text: m.content }],
  })) as ChatUIMessage[];

  const {
    messages,
    sendMessage,
    regenerate,
    status,
    error,
    clearError,
  } = useChat<ChatUIMessage>({
    id: conversationId ?? undefined,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: { projectId, conversationId, role },
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

  const handleSend = () => {
    if (
      !inputValue.trim() ||
      status === "streaming" ||
      status === "submitted"
    )
      return;
    sendMessage({ text: inputValue.trim() });
    setInputValue("");
  };

  const handleQuestionnaireSubmit = (message: string) => {
    if (status === "streaming" || status === "submitted") return;
    sendMessage({ text: message });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isGenerating = status === "streaming" || status === "submitted";
  const lastMessage = messages[messages.length - 1];
  const showFallbackLoader =
    isGenerating &&
    !!lastMessage &&
    !getMessageText(lastMessage) &&
    !getMessageStatus(lastMessage);

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <Avatar className="w-12 h-12 mx-auto mb-3 bg-primary/10">
                <AvatarFallback className="text-primary text-lg">
                  {agent?.name?.[0] ?? "?"}
                </AvatarFallback>
              </Avatar>
              <h3 className="font-medium mb-1">{agent?.name}</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                {agent?.id === "pm"
                  ? "你好！我是产品经理。告诉我你的想法，不管多模糊都没关系，我来帮你一步步梳理清楚。"
                  : `你好！我是${agent?.name}。让我们一起把方案推进下去。`}
              </p>
            </div>
          )}

          {messages.map((message, index) => {
            const text = getMessageText(message);
            const statusPart = getMessageStatus(message);
            const shouldRender = Boolean(text) || Boolean(statusPart);
            const questionnaire =
              message.role === "assistant" && text
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
                    {message.role === "user" ? "我" : agent?.name?.[0]}
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
                      <ChatMarkdown content={text} />
                    ) : (
                      <div className="whitespace-pre-wrap break-words">
                        {text}
                      </div>
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
                      onSubmit={handleQuestionnaireSubmit}
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
                  {agent?.name?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="rounded-2xl rounded-tl-sm border border-border/70 bg-card/90 px-4 py-3 shadow-sm">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 justify-center py-2">
              <p className="text-sm text-destructive">
                {error.message || "出错了，请重试"}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  clearError();
                  regenerate();
                }}
              >
                <RotateCcw className="w-3 h-3" />
                重试
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="border-t p-4 bg-card/50">
        <div className="flex gap-2">
          <Textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入你的想法或回复..."
            className="min-h-[44px] max-h-32 resize-none"
            rows={1}
            disabled={isGenerating}
          />
          <Button
            type="button"
            size="icon"
            disabled={!inputValue.trim() || isGenerating}
            className="shrink-0 self-end"
            onClick={handleSend}
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
