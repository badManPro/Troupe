"use client";

import { MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { ConversationSummary } from "@/types";

interface ConversationTabsProps {
  conversations: ConversationSummary[];
  activeConversationId: string | null;
  onSelect: (conversationId: string) => void;
  onCreate: () => void;
}

export function ConversationTabs({
  conversations,
  activeConversationId,
  onSelect,
  onCreate,
}: ConversationTabsProps) {
  return (
    <div className="border-b bg-background/70 px-4 py-2">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">当前角色会话</div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 rounded-full px-2.5 text-xs"
          onClick={onCreate}
        >
          <MessageSquarePlus className="h-3.5 w-3.5" />
          新对话
        </Button>
      </div>

      <ScrollArea className="mt-2 w-full whitespace-nowrap">
        <div className="flex gap-2 pb-1">
          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              type="button"
              onClick={() => onSelect(conversation.id)}
              className={cn(
                "min-w-0 max-w-[15rem] rounded-full border px-3 py-1.5 text-left text-xs transition-all",
                activeConversationId === conversation.id
                  ? "border-primary/25 bg-primary/10 text-primary shadow-sm"
                  : "border-border/70 bg-background/80 text-muted-foreground hover:border-primary/15 hover:bg-accent/35"
              )}
              title={conversation.label}
            >
              <div className="truncate font-medium">
                {conversation.label || "新对话"}
              </div>
              <div className="mt-0.5 text-[10px] opacity-80">
                {conversation.isEmpty
                  ? "空白上下文"
                  : `${conversation.messageCount} 条消息`}
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
