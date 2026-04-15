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
import type { AgentRole } from "@/types";
import { getAgentById } from "@/lib/agents/registry";

function getMessageText(
  message: { parts: Array<{ type: string; text?: string }> }
): string {
  return message.parts
    .filter((p) => p.type === "text")
    .map((p) => p.text ?? "")
    .join("");
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
  }));

  const {
    messages,
    sendMessage,
    regenerate,
    status,
    error,
    clearError,
  } = useChat({
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isGenerating = status === "streaming" || status === "submitted";

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

          {messages.map((message) => {
            const text = getMessageText(message);
            if (!text) return null;

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
                    "rounded-2xl px-4 py-2.5 max-w-[80%] text-sm leading-relaxed",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-muted rounded-tl-sm"
                  )}
                >
                  <div className="whitespace-pre-wrap break-words">{text}</div>
                </div>
              </div>
            );
          })}

          {isGenerating &&
            messages.length > 0 &&
            !getMessageText(messages[messages.length - 1]) && (
              <div className="flex gap-3">
                <Avatar className="w-8 h-8 bg-muted shrink-0">
                  <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                    {agent?.name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
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
