"use client";

import { cn } from "@/lib/utils";
import type { ConversationSummary } from "@/types";

interface ConversationTabsProps {
  conversations: ConversationSummary[];
  activeConversationId: string | null;
  onSelect: (conversationId: string) => void;
}

export function ConversationTabs({
  conversations,
  activeConversationId,
  onSelect,
}: ConversationTabsProps) {
  return (
    <div className="border-b bg-background/70 px-4 py-2">
      <div className="text-xs text-muted-foreground">当前角色会话</div>

      <div className="mt-2 overflow-x-auto pb-1">
        <div className="flex min-w-max gap-2 pr-4">
          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              type="button"
              onClick={() => onSelect(conversation.id)}
              className={cn(
                "min-w-0 max-w-[10rem] rounded-full border px-3 py-2 text-left text-xs transition-all",
                activeConversationId === conversation.id
                  ? "border-primary/25 bg-primary/10 text-primary shadow-sm"
                  : "border-border/70 bg-background/80 text-muted-foreground hover:border-primary/15 hover:bg-accent/35"
              )}
              title={conversation.title ?? conversation.label}
            >
              <div className="truncate font-medium">{conversation.label || "新对话"}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
